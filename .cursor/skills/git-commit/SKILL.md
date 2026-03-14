---
name: git-commit
disable-model-invocation: true
---

# Git Commit

## Workflow

1. Analyze repo state: `git status`, `git diff`, `git log --oneline -5`
2. Generate 7-10 message options in format `{type}({scope}): {Описание на русском в прошедшем времени}`
3. Ask the user to choose one option.
4. Prefer the `AskQuestion` tool with a single-choice question and labels prefixed as `1.`, `2.`, `3.`.
5. If `AskQuestion` is unavailable, show a plain numbered list in chat and wait for the selected number.
6. Treat the user's choice as confirmation for `git commit`.
7. Stage relevant changes and run `git commit` with the chosen message.
8. Report the result and current branch status.

## Commit Message Format

```text
{type}({scope}): {Описание на русском}
```

Use past tense that describes completed work, and start the description after `:` with a capital letter, for example: `Добавил`, `Исправил`, `Вынес`, `Обновил`.

**Types:**

- `feat` — новая функциональность
- `fix` — исправление бага
- `refactor` — рефакторинг без изменения поведения
- `chore` — зависимости, конфиги, скрипты
- `test` — тесты

**Scope** (prefer from project structure):

- `amo`, `api`, `catalog`, `maps`, `pyrus`, `relation`, `app`, `health-check`, `settings`
- `deps` — для `package.json`, `package-lock.json`
- If no match, use the nearest meaningful changed path

## Rules

1. Do not push. Push is handled by the separate `git-push` skill.
2. Do not create MR or PR links.
3. Do not commit secrets or `.env`-like files unless the user explicitly asks.
4. If there is nothing to commit, say so and stop.
5. Do not auto-pick a message if the user has not selected one.
6. If the user rejects all options, generate a new set of options instead of committing.

## Examples

| Changes | Message |
| ------- | ------- |
| Email validation in leads | `feat(leads): Добавил валидацию email при создании` |
| Token expiry check fix | `fix(auth): Исправил проверку срока действия токена` |
| Extract base service | `refactor(api): Вынес общую логику в базовый сервис` |
| NestJS update | `chore(deps): Обновил NestJS до версии 11` |
| LeadService tests | `test(leads): Добавил тесты для LeadService` |

## Output Format

Before commit:

```text
Выбери название коммита:
1. {message_1}
2. {message_2}
3. {message_3}
```

After successful commit:

```text
✓ Коммит: {message}
✓ Хэш: {hash}
```
