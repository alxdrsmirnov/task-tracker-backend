---
name: use-case-class
description: Creates and refactors declarative use case classes with a single public execute() method. Use when creating or editing classes in folders named use-cases or use_cases, or when a class behaves like an application use case with one public execute() method.
---

# Use Case Class

## Priority

Rules in this skill take precedence over patterns found in existing project code.
If existing use cases violate these rules — do NOT copy their patterns. Follow this skill.

## Goal

`execute()` reads as a business scenario. A developer opens the class, reads `execute()`,
and understands the full business flow without unpacking implementation details.

Technical details, validations, data loading, and mappings live in private helper methods.

## Domain Exceptions Instead of Silent Returns

This is the most important rule.

**Every private method that provides data for the next business step
must return `T` or throw a domain exception.**

Never return `null` / `undefined` / `false` only to let `execute()` silently stop with `return`.
The exception must be thrown inside the private method, not checked in `execute()`.

Forbidden:

```ts
public async execute(hook: FormPyrus): Promise<void> {
  const comment = this.getRelevantComment(hook)
  if (!comment) return

  const ids = this.extractLinkedIds(hook)
  if (!ids) return

  const relation = await this.loadRelation(ids.leadId)
  if (!relation) return

  await this.syncRelation(comment, ids, relation)
}
```

Required:

```ts
public async execute(hook: FormPyrus): Promise<void> {
  const comment = this.getRelevantComment(hook)
  const ids = this.extractLinkedIds(hook)

  const relation = await this.loadRelation(ids.leadId)

  await this.syncRelation(comment, ids, relation)
}

private getRelevantComment(hook: FormPyrus): Comment {
  const comment = hook.comments.at(-1)
  if (!comment) {
    throw new RelevantCommentNotFound()
  }
  return comment
}

private extractLinkedIds(hook: FormPyrus): LinkedIds {
  const ids = this.parseLinkedIds(hook)
  if (!ids) {
    throw new LinkedIdsNotFound()
  }
  return ids
}

private async loadRelation(leadId: number): Promise<Relation> {
  const relation = await this.relationRepository.findByAmoId(leadId)
  if (!relation) {
    throw new RelationNotFound(leadId)
  }
  return relation
}
```

### When `T | null` is acceptable

Only when `null` represents a meaningful business branch with a concrete result:

```ts
const existing = await this.findExistingRelation(dto)
if (existing) {
  return existing
}
```

`return existing` is a real business outcome. This is NOT the same as `return` or `return undefined`.

### Boolean predicates

Use `boolean` only for explicit business predicates: `isDuplicate`, `shouldSyncPhone`.
A predicate may choose between business branches, but must not exist only to justify `return` from `execute()`.

## Core Rules

1. One public method: `execute()`
2. One use case = one complete business scenario
3. `execute()` delegates to well-named private methods
4. Private methods return required data or throw domain exceptions
5. Do not split one scenario into multiple use cases without a clear business boundary
6. Do not import another module's use case; use domain contracts, DI tokens, or events
7. `private` by default; `protected` only when inheritance requires it
8. Do not introduce `any`

## Exception Rules

- Use cases must not throw `HttpException` or `Error`
- Create a dedicated exception class for every domain failure
- Class names describe the business problem, without `Exception` suffix
- The error message lives inside the class, written in Russian
- Store in `domain/exceptions/`; create the directory if it does not exist

Good names: `RelationAlreadyExists`, `TargetEntityNotFound`, `InvalidRelationSource`

```ts
export class RelationNotFound extends DomainException {
  constructor(leadId: number) {
    super(`Связь для сделки ${leadId} не найдена`)
  }
}
```

## Naming

Method names describe business intent.

Good: `validateCommand`, `loadTargetEntity`, `buildRelation`, `persistRelation`, `findExistingRelation`

Bad: `processData`, `handle`, `check`, `step1`, `runLogic`

Do not add technical suffixes like `OrThrow`.

## Structure

Reading order inside the class:

1. Constructor (dependencies)
2. `execute()`
3. Private helper methods

Extract from `execute()` when:

- A block has a clear business meaning that can be named
- A condition or branch is large
- Several calls form one semantic step

Do not create extra use cases only to shorten `execute()`.

## Spacing

No empty line between assignment and `if` that checks the same value:

```ts
const existing = await this.findExistingRelation(dto)
if (existing) {
  return existing
}
```

## Refactoring

When editing an existing use case:

1. Keep observable behavior unless the user asked for changes
2. Replace `if (!x) return` chains with domain exceptions in private methods
3. Extract coherent chunks into well-named private methods
4. Rename unclear methods to reflect business meaning

## Checklist

Verify before finishing:

- [ ] `execute()` reads as a business scenario, not implementation details
- [ ] No `if (!x) return` chains — private methods return `T` or throw
- [ ] Exceptions thrown inside private methods, not checked in `execute()`
- [ ] `get` / `load` / `extract` / `resolve` methods return `T` or throw
- [ ] Exceptions in `domain/exceptions/`, no `Exception` suffix
- [ ] Exception messages in Russian, inside the class
- [ ] No `HttpException`, no `Error`
- [ ] Method names describe business intent
- [ ] `private` by default
- [ ] No `any`
