# Run Tasks Autonomously

Autonomously execute a Task Master queue using the **orchestrator -> worker -> verifier** pattern, with parallel waves, independent verification, and file-collision detection.

Arguments: $ARGUMENTS

## Roles

There are three actors:

1. **Orchestrator** (you) - coordinates the queue, manages Task Master statuses through MCP, delegates tasks, parses subagent JSON reports, and makes decisions. The orchestrator does NOT write code.
2. **Worker** - completes one task: reads context, writes code, and runs lint. Contract: `.cursor/agents/worker.md`. Returns JSON.
3. **Verifier** - independently verifies the worker's output. Read-only: code reading, tests, and lint only. Contract: `.cursor/agents/verifier.md`. Returns JSON.

## Inputs

`$ARGUMENTS` = `<queue> [flags]`

### Queue

- empty / `all` / `pending` - all pending top-level tasks, filtered by dependencies and sorted by id. Subtasks are NOT enqueued separately; the worker handles them through the `Subtasks` checklist of the parent task.
- `next` - one task from `next_task`.
- `N` - one task, for example `7`.
- `N-M` - range.
- `a,b,c` or `a-b,c,d-e` - combination.
- Subtask IDs (`N.M`) are allowed only when explicitly listed.

### Flags (space-separated, any order)

- `parallel=K` - up to K subagents in parallel. The same limit applies to BOTH workers and verifiers. Default: `3`; reasonable maximum: `5`.
- `verify` - run every `completed` task through the verifier. **Enabled by default.**
- `no-verify` - disable verification, only when the user explicitly asks for it.
- `dry-run` - build the wave plan and show it to the user without launching workers.
- `priority=high|medium|low` - filter by priority.

If `$ARGUMENTS` cannot be parsed, ask ONE clarifying question and stop.

## Project Context

- `projectRoot` = current workspace root as an absolute path.
- `tag` = `currentTag` from `.taskmaster/state.json`. If the file or field is missing, fall back to `master` and log a warning.
- Pass `projectRoot` and `tag` to every Task Master MCP call.

## Subagent Types

Worker and verifier are registered as custom `subagent_type`s through frontmatter in `.cursor/agents/worker.md` and `.cursor/agents/verifier.md`. The content of those files becomes the subagent system prompt automatically. Invoke them DIRECTLY:

- worker - `subagent_type: "worker"`.
- verifier - `subagent_type: "verifier"`.

Do NOT duplicate anything already declared in the subagent's frontmatter or system prompt: no `model`, no `readonly`, no contract path (`.cursor/agents/...`) in the `prompt`. Duplication creates drift from the source of truth and wastes the model's attention.

`run-tasks` always delegates code work to `worker` and verification to `verifier`. Do NOT route tasks through `explore` or `shell`: those subagents do not return the worker JSON contract and would break Step C parsing.

## Language Policy

- Instruction language: English.
- Task/user-facing language: Russian.
- Machine-readable JSON schema: English keys/enums.
- Human-readable JSON values: Russian.
- Prompts sent to worker and verifier MUST provide task context and operational instructions in Russian.
- All user-facing orchestrator messages MUST be in Russian: launch plan, wave progress, blockers, collisions, awaiting-input questions, final summary, and diagnostics.

## Preparation (once)

1. Read `.taskmaster/state.json` -> `currentTag` (fallback: `master`).
2. Parse `$ARGUMENTS`:
   - extract queue and flags;
   - `verify` is ON by default unless `no-verify` is present.
3. Call `get_tasks` with `withSubtasks: true` to get the full list.
4. Build the task ID queue:
   - apply filters (priority, exclude `done` / `cancelled`);
   - keep only top-level tasks unless subtask IDs are listed explicitly in `$ARGUMENTS`;
   - topologically sort by dependencies inside the queue;
   - build **waves**: a wave contains tasks whose internal dependencies are ALL completed in previous waves.
5. **Cache rule frontmatter (once)**: read frontmatter (`alwaysApply`, `globs`, `description`) of every `.cursor/rules/*.mdc` file. Hold the result in memory and reuse it for ALL Rule Routing decisions in this run. Do NOT re-read frontmatter per task.
6. **Sanity-check**:
   - queue is empty after filtering -> say "нет готовых задач" and exit;
   - all specified IDs do not exist -> stop and ask the user;
   - `tag` is missing -> fall back to `master` and warn.
7. Output the launch plan to the user in Russian: waves with IDs, each wave size, flags, estimated parallelism.
8. If `dry-run`: exit. Otherwise:
   - Create a minimal `TodoWrite` with ONE line using actual values, e.g. `Running queue: 12 tasks, 3 waves, parallel=3, verify=on`. Do NOT duplicate the full task list; Task Master already has it.
   - Immediately enter the main loop. Do NOT wait for confirmation.

## Rule Routing (mandatory before every worker/verifier)

Subagents currently do not guarantee automatic visibility of `.cursor/rules/*.mdc`, especially rules with `globs`. Therefore the orchestrator MUST select and pass relevant rule files explicitly. Pass the rule **paths** only, not the rule contents - the worker/verifier prompt template below tells subagents to read those files themselves. This keeps the prompt compact and makes the source of rules explicit.

### How to Select Rules

1. Use the cached rule frontmatter from `Preparation` step 5.
2. Infer task `target_paths` from:
   - `description`, `details`, `testStrategy`, and subtasks;
   - explicitly mentioned files/directories;
   - dependencies and neighboring code if the task clearly names a module/layer.
3. Build `relevant_rules`:
   - rules with `alwaysApply: true` may be omitted (already in context) but explicitly adding them is allowed;
   - include every rule whose `globs` match any `target_paths`;
   - if the task requires code changes and `target_paths` cannot be inferred confidently, include ALL `.cursor/rules/*.mdc` files with `globs` so no architectural rule is missed.
4. Recompute `relevant_rules` if retry context or verifier issues introduce new `changed_files` / target directories.
5. For verifier: pass the same `relevant_rules` the worker received plus any additional rules that match the actual `changed_files`.

## Main Loop (by waves)

For each wave `i` out of `M`:

### Step A. Prepare the Wave

For each task in the wave:

1. Call `get_task` by ID to get full context.
2. Run **Rule Routing** for the task: compute `target_paths` and `relevant_rules`, and keep the list attached to the task for worker/retry/verifier prompts.
3. Recheck EXTERNAL dependencies, meaning dependencies not in the current queue:
   - if any dependency is not `done`, call `set_task_status id={ID} status=blocked`, log "dependencies not completed: ...", and remove the task from the wave.
4. For remaining tasks, call `set_task_status id={ID} status=in-progress`.

### Step B. Launch Workers in Parallel

Launch tasks in the wave in parallel using **one batch** of `Task` tool calls: multiple Task blocks in one message. Batch size = `parallel=K`. If the wave has more than K tasks, launch K, wait for them, then continue with the rest.

Parameters for each call:

- `subagent_type`: `"worker"`.
- `description`: `Task {ID}: {title}` (short title).
- `prompt`: use the template below.

Worker prompt template:

```text
КОНТЕКСТ ЗАДАЧИ
Task ID: <ID>
Title: <title>
Priority: <priority>

Description:
<description>

Details:
<details>

Test Strategy:
<testStrategy>

Subtasks (внутренний чек-лист, по порядку):
<полный список subtasks с details, либо "none">

Dependencies (уже выполнены):
<список id+title, либо "none">

Target paths inferred by orchestrator:
<список target_paths, либо "unknown">

Relevant Cursor Rules:
<relative paths из relevant_rules, либо "- none">

Перед правками прочитай эти rule-файлы и считай их обязательными.
Если задача конфликтует с ними, остановись и верни `blocked` с понятным `blocker`.
Если поймёшь, что правки должны затронуть путь, покрытый непереданным Cursor rule, остановись и сообщи о missing rule routing вместо угадывания.
В финальном JSON перечисли применённые rules в поле `applied_rules`.

[ОПЦИОНАЛЬНО, если это retry]
PREVIOUS_ATTEMPTS_HISTORY:
<история прошлых попыток: что пробовали, результат, ошибки/issues>

[ОПЦИОНАЛЬНО, если verifier потребовал доработку]
PREVIOUS_VERIFY_ISSUES:
<issues от verifier с прошлой попытки>

[ОПЦИОНАЛЬНО, если задача возобновлена после needs_user_input]
USER_RESPONSE:
<ответ пользователя дословно>

Финальное сообщение: JSON-блок согласно твоему контракту.
```

### Step C. Collect Worker Reports

Wait for every worker in the wave. Extract the JSON block from each response using this algorithm:

1. Find the **last** fenced code block tagged `json` in the response.
2. Parse it as JSON.
3. If parsing fails, treat it as `status="failed"`, `error="malformed report: <first 200 chars of response>"`.
4. If required fields are missing (`status` for worker, `verify_status` for verifier), treat it the same way.

The same algorithm applies to verifier reports in Step D.

### Step C.5. `changed_files` Collision Detector

AFTER collecting worker JSON reports and BEFORE launching verifiers:

1. Collect `changed_files` from each task in the wave where `status="completed"`.
   - Normalize paths: remove leading `./`, normalize separators to `/`.
   - Ignore absolute paths outside `projectRoot`.
   - Ignore paths from this allowlist:
     - `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` - lockfiles.
     - `.taskmaster/state.json`, `.taskmaster/config.json` - Task Master service files. Workers must not touch them, but ignore them here if they appear.

2. Build a collision graph:
   - Nodes are tasks with `status="completed"`.
   - Edges connect tasks whose `changed_files` intersect (at least one shared path).
   - Find connected components using union-find or DFS.

3. For each component of size >= 2:
   - Do NOT launch verifier for those tasks; the file state has already been overwritten, so verification is not meaningful.
   - For each task in the component: `set_task_status id={ID} status=review`.
   - Tasks marked here SKIP Step D and Step E entirely.
   - Create a collision block for the component:

     ```text
     КОЛЛИЗИЯ в волне {i}:
       Задачи: {список ID}
       Конфликтующие файлы:
         - <path> (правили: <ID_1>, <ID_2>, ...)
         - <path> (правили: <ID>, ...)
       Действие: задачи переведены в `review`. Посмотри git diff, оставь лучшую версию,
                 затем перезапусти остальные задачи через:
               /run-tasks {remaining_IDs} parallel=1
     ```

   - Store the block in the run-level collision accumulator for the final summary.
   - Log the block to the user chat immediately.

4. Tasks in components of size 1 continue to Step D (verifier).

5. Tasks whose `status` is not `"completed"` (failed/blocked/needs_user_input) are not touched by the detector; they have their own logic in Step E.

### Step D. Verification (if `verify` is enabled)

For each task with `status="completed"` that **passed Step C.5** (not part of a collision), launch verifier in parallel through the `Task` tool. Use the same `parallel=K` batch limit as Step B.

Parameters:

- `subagent_type`: `"verifier"`.
- `description`: `Verify Task {ID}: {title}`.

Verifier prompt template:

```text
ВЕРИФИКАЦИЯ
Task ID: <ID>
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
<список worker.changed_files>

Relevant Cursor Rules:
<relative paths из worker relevant_rules + rules, дополнительно сматченные по worker.changed_files, либо "- none">

Перед проверкой прочитай эти rule-файлы и считай их обязательными.
Проверь, что реализация им соответствует.
Если worker изменил файлы, которые должны были сматчить непереданный Cursor rule, добавь issue с `category: "architecture"` и опиши missing rule routing.
В финальном JSON перечисли применённые rules в поле `applied_rules`.

Финальное сообщение: JSON-блок согласно твоему контракту.
```

Wait for all verifiers. Parse each report using the algorithm from Step C.

### Step E. Finalize Wave Tasks

Apply decision rules from top to bottom. The first matching condition determines the action. Tasks already marked `review` by Step C.5 (collisions) are skipped here entirely.

- **`worker.status="completed"` + `verifier.recommendation="accept"` (or `verify` is disabled)**
  - `set_task_status id={ID} status=done`. If `verifier.issues` is non-empty (style notes), add them to the **style-notes** accumulator for the final summary. Task status remains `done`.
- **`worker.status="completed"` + `verifier.recommendation="rework"` (first time only)**
  - Launch ONE retry worker in the same wave with `PREVIOUS_VERIFY_ISSUES` (pass `category` + `severity` + `file:line` + `description` + `suggestion` + `reference` for each issue). Then re-run Step C and Step D for that single task with one mutation: any non-`accept` outcome on this retry collapses to `set_task_status id={ID} status=review`. There is NO third attempt.
- **`worker.status="completed"` + `verifier.recommendation="reject"`**
  - `set_task_status id={ID} status=review`. Include `issues` in the final user summary (`category` + `severity` + `file:line` + `description` + `suggestion`). Do NOT stop.
- **`worker.status="needs_user_input"`**
  - **STOP**. Pass `question` to the user exactly as written and add your own context (Task ID, what has already been done). After the user answers, rerun the worker with a `USER_RESPONSE` block; do not start from scratch.
- **`worker.status="blocked"`**
  - `set_task_status id={ID} status=blocked`, log `blocker`, then continue.
- **`worker.status="failed"` (1st attempt)**
  - Retry with a worker using `PREVIOUS_ATTEMPTS_HISTORY`. In the prompt, ask the worker to first describe its plan in the first reply. Re-run Step C and Step D for that task; treat the retry result by these same rules, except `failed` on retry collapses to the diagnostic mode below.
- **`worker.status="failed"` (2nd attempt)**
  - **diagnostic mode**: launch verifier with the goal "diagnose what is blocking progress" using the prompt below. Its report goes to the final user summary. `set_task_status id={ID} status=review`, then continue. Do NOT re-apply Step E rules to the diagnostic verifier output.

Diagnostic prompt, used instead of normal verifier after two failed worker attempts. Use the same `subagent_type: "verifier"`, but override the goal:

```text
ДИАГНОСТИЧЕСКИЙ РЕЖИМ
Твоя цель НЕ принять/отклонить работу, а ОБЪЯСНИТЬ, почему задача дважды провалилась. Read-only ограничения и общий стиль работы остаются прежними, но формат отчёта переопределён ниже.

ДИАГНОСТИКА
Task ID и контекст задачи: <...>
Что пробовали: <PREVIOUS_ATTEMPTS_HISTORY>

Найди:
- какие предположения worker были неверны;
- что в кодовой базе мешает задаче (отсутствует, сломано, не задокументировано);
- какой реальный объём работы нужен;
- стоит ли разбить задачу на subtasks и как.

В JSON-отчёте используй `verify_status: "inconclusive"` и `recommendation: "reject"`. Диагностику положи в `issues` с `severity` и `description`. В `summary` дай короткий вывод для пользователя.
```

### Step F. Wave Progress

After each wave, output this block:

```text
Волна {i}/{M}:
  Выполнено:      [список ID]
  На review:      [список ID + причина в одну строку]
  Коллизии:       [список ID + конфликтующие файлы] (если были в C.5)
  Заблокировано:  [список ID + причина]
  Ожидает ввода:  [список ID + вопрос]   <-- СТОП, если непустой
```

If `Ожидает ввода` is non-empty, stop until the user answers.

## Completion

When all waves are complete:

1. Call `get_tasks` for a fresh snapshot.
2. User summary in Russian:
   - **Готово**: список ID + summary в одну строку.
   - **Стилистические замечания**: для done-задач с непустым `verifier.issues` - список ID + по каждой issue одна строка (`category/severity` + `file:line` + `description` -> `suggestion`). Это не блокеры, но их стоит просмотреть.
   - **На review**: список ID + verifier issues по каждой задаче (`category/severity` + `file:line` + `description` -> `suggestion`, с `reference`, если полезно).
   - **Коллизии**: накопленные блоки `КОЛЛИЗИЯ` со всех волн, если были.
   - **Заблокировано**: список ID + причины.
   - **Ожидает ввода**: если что-то осталось, список ID + вопросы.
   - **Провалено/диагностика**: список ID + диагностика, если использовался diagnostic mode.
3. Aggregated changed file list in Russian: union of `changed_files` from all workers, deduplicated.
4. Do NOT suggest a commit or PR.

## Critical Autonomy Rules

- Do NOT stop between waves for `done` / `blocked` / `review` / `failed->review` / `collision->review`. Immediately proceed to the next wave.
- Stop ONLY for:
  - `needs_user_input` from a worker;
  - ambiguous `$ARGUMENTS`;
  - failed startup sanity-check (no tasks, invalid tag, etc.);
  - Task Master MCP unavailable after 3 attempts with exponential backoff (1s -> 2s -> 4s).
- Do NOT edit `tasks.json` directly; use only Task Master MCP tools.
- Do NOT commit, push, or create PRs.
- Do NOT call `autopilot_*` tools; this command has its own orchestration.
- Neither worker nor verifier may change Task Master statuses. This is exclusively the orchestrator's responsibility.

## Start

Run "Preparation", then immediately start the main loop. Do not ask for confirmation.
