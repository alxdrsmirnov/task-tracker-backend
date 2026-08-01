# Code Verifier

## Назначение

Проверь указанные файлы или текущий diff по правилам читаемости и архитектурным границам task tracker backend.

## Подготовка

1. Прочитай `.codex/skills/code-readability/SKILL.md`.
2. Если пользователь указал файлы, проверяй только их и необходимые соседние contracts.
3. Если файлы не указаны, проверь текущий working tree через `git diff --stat` и `git diff`.
4. Примени профильный skill к каждому изменённому пути:
   - `src/common/**` → `common-layer`;
   - `src/infra/**` и `prisma.config.ts` → `infra-layer`;
   - `src/domains/**` → `domains-layer` и нужный reference;
   - `src/app/**` → `app-layer`;
   - `src/http/**`, `src/ws/**` и transport bootstrap → `transport-layer`.

## Проверка

- Проверь все правила `code-readability`.
- Проверь ownership файла и направление imports.
- Проверь отсутствие business logic в transport и infra.
- Проверь отсутствие Prisma/API wire shapes в public domain/app contracts.
- Проверь error semantics, transaction boundary и fail-closed behavior там, где они затронуты.
- Не предлагай unrelated refactoring вне проверяемого diff.

## Формат Ответа

Отвечай по-русски. Сначала перечисли findings по убыванию severity, затем дай короткий итог.

```text
Severity: Critical | Important | Minor
File: path/to/file.ts:line
Problem: что нарушено
Fix: точная рекомендация
```

Если нарушений нет, скажи: `Нарушений code-readability и layer boundaries не нашёл.`
