# Trade-offs

## Purpose

Force the model to explore multiple approaches and compare their trade-offs before deciding. Prevent tunneling on the first idea that comes to mind.

## Non-Negotiable Rules

1. **At least 2 alternatives.** At least two approaches MUST be proposed and compared: pros, cons, risks.
2. **At least 3 concrete risks / edge cases.** "May fail" does not count. Name exact conditions: empty input, concurrent access, large payload, null fields, network error, race, invariant violation.
3. **Decision must reference alternatives.** The chosen approach MUST be justified against the others by citing the pros/cons listed above.
4. **No code until the approach is chosen.** Implementation starts only after the decision block is produced.

## Forbidden

- Picking the first approach that comes to mind without comparison.
- A single-sentence "Plan:" — that is not a plan.
- Listing approaches without pros/cons/risks for each.
- Vague risks without naming the exact failure condition.

## Workflow

### 1. Alternatives (at least 2)

For each approach:

- Name (1 line).
- How it works (2–4 sentences).
- Pros.
- Cons.
- Risks / unknowns.

### 2. Decision

Pick one alternative. Explain **why this one and not the others**, referencing the pros/cons from step 1.

### 3. Risks & edge cases (at least 3)

List concrete situations and specify how the chosen approach handles each.

### 4. Implementation

Only now — the code. Faithful to the chosen approach.

## Output Format

The response ALWAYS starts with this block (in Russian):

```text
Анализ задачи
─────────────
Проблема: {переформулированная задача одним-двумя предложениями}

Рассмотренные подходы:
1. {Название} — {как работает, 1–2 предложения}
   + плюсы: {…}
   − минусы: {…}
   ⚠ риски: {…}
2. {Название} — {как работает, 1–2 предложения}
   + плюсы: {…}
   − минусы: {…}
   ⚠ риски: {…}

Выбранный подход: {название}
Почему: {обоснование со ссылкой на плюсы/минусы выше}

Риски и edge cases:
- {конкретная ситуация} → {как обрабатывается}
- {конкретная ситуация} → {как обрабатывается}
- {конкретная ситуация} → {как обрабатывается}
─────────────
```

After the block — the final answer or code.

## Combining

When invoked together with `focus`: use the formal block above as the analysis output — do not produce both a free-form and a formal block. Follow `focus` for context gathering and self-check, then emit the formal block in place of the free-form one.
