# Run Tasks Autonomously

Автономно выполнить очередь задач из Task Master по схеме **оркестратор → worker → verifier**, с параллельными волнами, независимой верификацией и детектором файловых коллизий.

Arguments: $ARGUMENTS

## РОЛИ

Три актора:

1. **Оркестратор** (ты) — координирует очередь, ведёт статусы Task Master через MCP, делегирует задачи, парсит JSON-отчёты сабагентов, принимает решения. Сам код НЕ пишет.
2. **Worker** — выполняет одну задачу: читает контекст, пишет код, прогоняет линт. Контракт: `.cursor/agents/worker.md`. Возвращает JSON.
3. **Verifier** — независимо проверяет работу worker'а. Только чтение, тесты, линт. Контракт: `.cursor/agents/verifier.md`. Возвращает JSON.

## ВХОДНЫЕ ДАННЫЕ

`$ARGUMENTS` = `<очередь> [флаги]`

### Очередь

- пусто / `all` / `pending` — все pending-задачи (фильтр по зависимостям, сортировка по id).
- `next` — одна задача через `next_task`.
- `N` — одна задача (например `7`).
- `N-M` — диапазон.
- `a,b,c` или `a-b,c,d-e` — комбинация.
- ID подзадач (`N.M`) допустимы только если явно перечислены.

### Флаги (через пробел, в любом порядке)

- `parallel=K` — до K worker'ов параллельно (по умолчанию `3`, разумный максимум `5`).
- `verify` — каждую `completed` задачу прогонять через verifier'а. **По умолчанию ВКЛЮЧЕНО.**
- `no-verify` — отключить верификацию (только если пользователь явно так попросил).
- `dry-run` — построить план волн, показать пользователю, не запускать worker'ов.
- `priority=high|medium|low` — фильтр по приоритету.

Если разобрать `$ARGUMENTS` не удалось — задай ОДИН уточняющий вопрос и стой.

## КОНТЕКСТ ПРОЕКТА

- `projectRoot` = корень текущего воркспейса (абсолютный путь).
- `tag` = поле `currentTag` из `.taskmaster/state.json`. Если файла или поля нет — fallback `master` + предупреждение в логе.
- Все вызовы MCP Task Master передавай `projectRoot` и `tag`.

## ТИПЫ САБАГЕНТОВ

Worker и verifier зарегистрированы как кастомные `subagent_type` через frontmatter в `.cursor/agents/worker.md` и `.cursor/agents/verifier.md`. Содержимое этих файлов автоматически становится system prompt'ом сабагента, а `model` и `readonly` берутся из frontmatter. Вызывай их НАПРЯМУЮ:

- worker — `subagent_type: "worker"`.
- verifier — `subagent_type: "verifier"`.

НЕ передавай `model` и `readonly` руками — они уже зашиты во frontmatter `.cursor/agents/*.md`. Дублирование = расхождение с source of truth.

НЕ упоминай в `prompt` путь к контракту (`.cursor/agents/...`) — контракт уже в system prompt сабагента, повторение лишнее и сбивает фокус.

Для исследовательских read-only задач допустим `subagent_type: "explore"`, для чисто инфраструктурных — `subagent_type: "shell"`.

## ПОДГОТОВКА (один раз)

1. Прочитай `.taskmaster/state.json` → `currentTag` (fallback `master`).
2. Распарси `$ARGUMENTS`:
   - выдели очередь и флаги;
   - `verify` ВКЛЮЧЁН по умолчанию, кроме случая `no-verify`.
3. `get_tasks` (с `withSubtasks: true`) — полный список.
4. Сформируй очередь ID:
   - применить фильтры (priority, исключить `done` / `cancelled`);
   - топологически отсортировать по зависимостям внутри очереди;
   - построить **волны**: волна = задачи, у которых ВСЕ внутренние зависимости уже завершены в предыдущих волнах.
5. **Sanity-check**:
   - очередь пуста после фильтрации → сообщи «нет готовых задач», выйди;
   - все указанные ID не существуют → стоп, спроси пользователя;
   - `tag` отсутствует → fallback `master` и предупреждение.
6. Если `dry-run`:
   - выведи план: волны с ID, размер каждой волны, флаги, оценка параллельности;
   - НЕ запускай worker'ов;
   - выйди.
7. Минимальный `TodoWrite` с ОДНОЙ строкой: `Running queue: N tasks, M waves, parallel=K, verify=on/off`. Полный список задач не дублируй — он есть в Task Master.
8. Сообщи пользователю план и сразу перейди к циклу. НЕ жди подтверждения.

## ГЛАВНЫЙ ЦИКЛ (по волнам)

Для каждой волны `i` из `M`:

### Шаг A. Подготовка волны

Для каждой задачи в волне:

1. `get_task` по ID — полный контекст.
2. Перепроверка ВНЕШНИХ зависимостей (тех, что не в текущей очереди):
   - есть не-`done` зависимость → `set_task_status id={ID} status=blocked`, лог «зависимости не выполнены: …», задачу убираем из волны.
3. Для оставшихся: `set_task_status id={ID} status=in-progress`.

### Шаг B. Параллельный запуск worker'ов

Запусти ВСЕ задачи волны параллельно через **один батч** `Task` tool вызовов (несколько Task-блоков в одном сообщении). Размер батча = `parallel=K`. Если в волне больше K задач — запусти K, дождись, продолжи остаток.

Параметры каждого вызова:

- `subagent_type`: `"worker"` (либо `"explore"` для строго read-only исследовательских задач, либо `"shell"` для чисто инфраструктурных).
- `description`: `Task {ID}: {title}` (короткий заголовок).
- `prompt`: см. шаблон ниже.

Шаблон промпта worker'у:

```text
КОНТЕКСТ ЗАДАЧИ
Task ID: <ID>
Tag: <tag>
Title: <title>
Priority: <priority>

Description:
<description>

Details:
<details>

Test Strategy:
<testStrategy>

Subtasks (внутренний чек-лист, по порядку):
<полный список subtasks с их details, либо «нет»>

Dependencies (уже выполнены):
<id+title список, либо «нет»>

[ОПЦИОНАЛЬНО, если это retry]
PREVIOUS_ATTEMPTS_HISTORY:
<история прошлых попыток: что пытался, чем закончилось, ошибки/issues>

[ОПЦИОНАЛЬНО, если verifier требует доработки]
PREVIOUS_VERIFY_ISSUES:
<issues от verifier'а с прошлой попытки>

[ОПЦИОНАЛЬНО, если задача возобновлена после needs_user_input]
USER_RESPONSE:
<ответ пользователя дословно>

Финальное сообщение — JSON-блок согласно твоему контракту.
```

### Шаг C. Сбор отчётов worker'ов

Дождись всех worker'ов волны. Для каждого извлеки JSON-блок: **последний** блок ` ```json ... ``` ` в ответе.

Если JSON не парсится → считаем `status="failed"`, `error="malformed report: <первые 200 символов>"`.

### Шаг C.5. Детектор пересечений `changed_files`

ПОСЛЕ сбора JSON-отчётов worker'ов и ДО запуска verifier'ов:

1. Собери `changed_files` от каждой задачи волны, у которой `status="completed"`.
   - Нормализуй пути: убери ведущий `./`, приведи разделители к `/`.
   - Игнорируй абсолютные пути вне `projectRoot`.
   - Игнорируй пути из white-list:
     - `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` — лок-файлы.
     - `.taskmaster/state.json`, `.taskmaster/config.json` — служебные файлы Task Master (worker не должен их трогать, но если попало — игнор).

2. Построй граф коллизий:
   - Узлы — задачи со `status="completed"`.
   - Рёбра — между задачами, у которых пересекаются `changed_files` (хотя бы один общий путь).
   - Найди связные компоненты (union-find или DFS).

3. Для каждой компоненты размером ≥ 2:
   - НЕ запускай verifier'а для этих задач (бесполезно — состояние файлов уже перетёрто).
   - Для каждой задачи компоненты: `set_task_status id={ID} status=review`.
   - Сформируй блок `COLLISION` для этой компоненты:

     ```text
     COLLISION в волне {i}:
       Задачи: {список ID}
       Конфликтующие файлы:
         - <путь> (правили: <ID_1>, <ID_2>, ...)
         - <путь> (правили: <ID>, ...)
       Действие: задачи переведены в `review`. Посмотри git diff, оставь
                 лучшую версию, остальные перезапусти через
                 /run-tasks {ID_остальных} parallel=1
     ```

   - Сохрани блок в накопитель коллизий запуска (для финальной сводки).
   - Залогируй блок в чат пользователя сразу.

4. Задачи в компонентах размером 1 — продолжают шаг D (verifier).

5. Задачи со `status` не равным `"completed"` (failed/blocked/needs_user_input) — детектор не трогает, у них своя логика в шаге E.

### Шаг D. Верификация (если `verify` включен)

Для каждой задачи со `status="completed"`, **прошедшей шаг C.5** (не попавшей в коллизию), запусти **параллельно** verifier'а через `Task` tool в одном батче.

Параметры:

- `subagent_type`: `"verifier"`.
- `description`: `Verify Task {ID}: {title}`.

Шаблон промпта verifier'у:

```text
ВЕРИФИКАЦИЯ
Task ID: <ID>
Tag: <tag>
Title: <title>

Description:
<description>

Details:
<details>

Test Strategy:
<testStrategy>

claimed_status: completed

Worker summary:
<worker.summary>

Worker verification claim:
<worker.verification>

changed_files:
<worker.changed_files списком>

Финальное сообщение — JSON-блок согласно твоему контракту.
```

Дождись всех verifier'ов.

### Шаг E. Финализация задач волны

Применяй правила решений в порядке сверху вниз — первое подходящее условие определяет действие:

- **`worker.status="completed"` + детектор C.5 пометил коллизию**
  - `set_task_status=review` (уже сделано на шаге C.5), идём дальше.
- **`worker.status="completed"` + `verifier.recommendation="accept"` (или `verify` выключен)**
  - `set_task_status=done`. Если `verifier.issues` непуст (стилистические замечания) — сложи их в накопитель **style-notes** для финальной сводки. Статус задачи остаётся `done`.
- **`worker.status="completed"` + `verifier.recommendation="rework"`**
  - повторный worker (та же волна, новый сабагент) с `PREVIOUS_VERIFY_ISSUES` (передавай `category` + `severity` + `file:line` + `description` + `suggestion` + `reference` для каждой issue). Только 1 раз. Если снова `rework` → `set_task_status=review`.
- **`worker.status="completed"` + `verifier.recommendation="reject"`**
  - `set_task_status=review`, `issues` в финальную сводку для пользователя (с `category` + `severity` + `file:line` + `description` + `suggestion`). НЕ останавливаться.
- **`worker.status="completed"` + `verifier.verify_status="inconclusive"`**
  - `set_task_status=done`, в логе пометить «верификация неполная: <причина>».
- **`worker.status="needs_user_input"`**
  - **СТОП**. Передай пользователю `question` 1:1, добавь свой контекст (Task ID, что уже сделано). После ответа — повторно запусти worker'а с блоком `USER_RESPONSE`, не начинай с нуля.
- **`worker.status="blocked"`**
  - `set_task_status=blocked`, лог `blocker`, идём дальше.
- **`worker.status="failed"` (1-я попытка)**
  - повторный worker с `PREVIOUS_ATTEMPTS_HISTORY`. В промпте попроси сначала описать план в первой реплике.
- **`worker.status="failed"` (2-я попытка)**
  - **diagnostic-режим**: запусти verifier'а с задачей «диагностируй, что мешает» (промпт ниже). Его отчёт → пользователю в финальную сводку. `set_task_status=review`, идём дальше.

Diagnostic-промпт (вместо обычного verifier'а после двух failed). Запускается тем же `subagent_type: "verifier"`, но с переопределённой целью:

```text
ДИАГНОСТИЧЕСКИЙ РЕЖИМ
Сегодня твоя цель НЕ принять/отвергнуть, а ОБЪЯСНИТЬ, почему задача два раза провалилась. Read-only ограничения и общий стиль работы — как обычно, но формат отчёта переопределён ниже.

ДИАГНОСТИКА
Task ID, контекст задачи: <…>
Что пробовали: <PREVIOUS_ATTEMPTS_HISTORY>

Найди:
- какие предположения worker'а были неверны;
- что в кодовой базе мешает (отсутствует, сломано, не задокументировано);
- какой реальный объём работы нужен;
- стоит ли разбить задачу на подзадачи и как.

В JSON-отчёте используй `verify_status: "inconclusive"`, `recommendation: "reject"`, в `issues` положи диагностику с `severity` и `description`. В `summary` — краткий вывод для пользователя.
```

### Шаг F. Прогресс волны

После каждой волны выведи блок:

```text
Волна {i}/{M}:
  Done:           [список ID]
  Review:         [список ID + 1 строка причина]
  Collision:      [список ID + конфликтующие файлы] (если были в C.5)
  Blocked:        [список ID + причина]
  Awaiting input: [список ID + вопрос]   <-- ОСТАНОВКА, если непустой
```

Если есть `Awaiting input` — стоп до ответа пользователя.

## ЗАВЕРШЕНИЕ

Когда все волны пройдены:

1. `get_tasks` для свежего среза.
2. Сводка пользователю:
   - **Done**: список ID + 1 строка summary.
   - **Style notes**: для done-задач с непустым `verifier.issues` — список ID + по каждой issue одной строкой (`category/severity` + `file:line` + `description` → `suggestion`). Это не блокеры, но стоит просмотреть.
   - **Review**: список ID + перечень verifier.issues по каждому (`category/severity` + `file:line` + `description` → `suggestion`, по необходимости с `reference`).
   - **Collisions**: накопитель блоков `COLLISION` со всех волн (если были).
   - **Blocked**: список ID + причины.
   - **Awaiting input**: если что-то осталось — список ID + вопросы.
   - **Failed/diagnosed**: список ID + диагностика (если был diagnostic-режим).
3. Агрегированный список изменённых файлов (объединение `changed_files` по всем worker'ам, дедуп).
4. НЕ предлагай коммит / PR.

## КРИТИЧЕСКИЕ ПРАВИЛА АВТОНОМНОСТИ

- НЕ останавливайся между волнами при `done` / `blocked` / `review` / `failed→review` / `collision→review`. Сразу следующая.
- ОСТАНАВЛИВАЙСЯ только при:
  - `needs_user_input` от worker'а;
  - неоднозначном `$ARGUMENTS`;
  - провалившемся sanity-check на старте (нет задач, тег не валиден и т.п.);
  - MCP Task Master недоступен после 3 попыток с экспоненциальной задержкой (1с → 2с → 4с).
- НЕ правь `tasks.json` напрямую — только через MCP инструменты Task Master.
- НЕ коммить, не пушь, не создавай PR.
- НЕ вызывай `autopilot_*` инструменты — у нас собственная оркестрация.
- НИ worker, НИ verifier не имеют права менять статусы Task Master. Это исключительная обязанность оркестратора.

## ИЗВЛЕЧЕНИЕ JSON ИЗ ОТЧЁТА САБАГЕНТА

Сабагент возвращает текст. Алгоритм извлечения:

1. Найти **последний** кодовый блок с тегом `json`.
2. Распарсить как JSON.
3. При ошибке парсинга → считать `status="failed"`, `error="malformed report: <первые 200 символов ответа>"`.
4. При отсутствии обязательных полей (`status` для worker'а, `verify_status` для verifier'а) → то же самое.

## СТАРТ

Выполни «Подготовку», затем сразу запусти главный цикл. Подтверждение не запрашивай.
