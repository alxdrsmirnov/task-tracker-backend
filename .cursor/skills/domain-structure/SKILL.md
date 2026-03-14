---
name: domain-structure
description: Organizes `src/modules/{moduleName}/domain/` in project modules and keeps domain boundaries clean. Use when creating or refactoring domain folders, deciding where domain code belongs, or working with `models`, `repositories`, `gateways`, `types`, `di.tokens.ts`, `exceptions`, and `domain/index.ts`.
---

# Module Domain Structure

## Scope

Apply this skill when at least one of these signals is present:

1. The work touches `src/modules/*/domain/**`
2. The task is to create or refactor a module's `domain/` structure
3. The task mentions `models`, `repositories`, `gateways`, `types`, `di.tokens.ts`, `exceptions`, or `domain/index.ts`
4. The task requires deciding whether code belongs to `domain` or `infra`

## Goal

Keep `domain/` predictable, business-oriented, and independent from `infra`.

A developer should be able to open `domain/` and immediately see:

1. Business entities in `models`
2. Database contracts in `repositories`
3. External API contracts in `gateways`
4. Supporting domain types in `types`
5. Domain-specific exceptions in `exceptions`
6. Public domain exports in `domain/index.ts`

## Target Shape

Use this target shape for `src/modules/{moduleName}/domain/`:

```text
domain/
  index.ts
  di.tokens.ts
  models/
  repositories/
  gateways/
  types/
  exceptions/
```

Rules for creation:

1. `domain/index.ts` is required
2. `di.tokens.ts` is created when the module has domain contracts (`repositories/` or `gateways/`)
3. `repositories/` is created only when the module needs database or persistence contracts
4. `gateways/` is created only when the module needs external API contracts
5. `constants.ts` is created when the module has shared domain constants; keep it focused on domain values
6. `utils` is created only when a narrow domain helper is truly needed and the logic does not belong to a model, type, contract, or use case; do not create by default
7. Do not create `entities/` inside `domain/`; use `models/`

## Folder Rules

Before creating a new file in `domain/`, classify the artifact:

- Business entity -> `models/`
- Supporting type or `enum` -> `types/`
- Database contract -> `repositories/`
- External API contract -> `gateways/`
- Domain-specific error -> `exceptions/`
- Domain DI token -> `di.tokens.ts`
- Implementation detail -> not `domain/`; check `infra` or another layer

### `models/`

Store only business entities.

Rules:

1. Use `interface`; an `interface` in `models/` must pass the business entity checklist below
2. Keep exactly one business entity per file
3. A model may reference local supporting types from `types/` when they describe entity fields
4. Do not place helper `type`, `enum`, DTO, transport payload, repository args, gateway args, or infrastructure shapes here

Naming:

- File: `{entity}.ts` in `kebab-case` (e.g. `custom-field.ts`)
- Interface: `PascalCase` without `I` prefix (e.g. `CustomField`)

Business entity checklist:

1. The structure has standalone business meaning
2. The structure would still make sense without HTTP, SDK, ORM, or DB-specific representation
3. The structure is not created only for one method's input or output
4. The structure is not just params, payload, response, row, entity, dto, or patch data
5. The structure represents "what the business works with", not "how a specific adapter exchanges data"

Good fit: `relation.ts`, `lead.ts`, `task.ts`, `pizzeria.ts`

Bad fit: `relation-search.types.ts`, `amo-response.ts`, `create-relation.dto.ts`

### `types/`

Store only supporting types.

An `interface` in `types/` is a supporting structure: method arguments, search params, composite field types, or grouped data that does not pass the business entity checklist.

Use this folder for:

1. `enum`
2. Repository method arguments
3. Gateway method arguments
4. Search or filter params
5. Grouped aliases and helper interfaces that are not business entities

Rules:

1. Group related supporting types in one file when they belong to the same topic
2. Do not move business entities here just because they are expressed as types

Naming:

- File: `{topic}.types.ts` in `kebab-case` (e.g. `custom-field.types.ts`, `webhook.types.ts`)
- Types: `PascalCase` with descriptive suffixes such as `Params`, `Payload`, `Data`, `Filter`, `Sort`, `Update`, `Item`, `Detail` (e.g. `FormRegisterParams`, `AmoCandidateData`, `MapPizzeriaItem`)

Good fit: `amo-enums.types.ts`, `field.types.ts`, `map-pizzeria.types.ts`

Bad fit: `lead.types.ts` (if `Lead` is a business entity, it belongs in `models/lead.ts`)

### `repositories/`

Store only persistence contracts.

Rules:

1. Only `interface`
2. Only for database or internal persistence access
3. Methods should accept and return `models`, local supporting types from `types/`, primitive types, or shared types from `src/common/types`
4. Never place implementation classes here
5. Prefer method names that describe business persistence intent, such as `findById`, `create`, `search`, `update`, or `delete`
6. Do not expose ORM helpers, query builders, repository instances, or persistence result wrappers

Naming:

- File: `{entity}.repository.ts` in `kebab-case` (e.g. `pizzeria.repository.ts`)
- Interface: `{Entity}Repository` (e.g. `PizzeriaRepository`)

Good fit: `pizzeria.repository.ts`, `relation.repository.ts`

Bad fit: `amo-lead.repository.ts` (amoCRM is an external API — use `gateways/`)

### `gateways/`

Store only external integration contracts.

Rules:

1. Only `interface`
2. Only for external APIs and integrations (amoCRM, HH, Pyrus, Avito, etc.)
3. Methods should accept and return `models`, local supporting types from `types/`, primitive types, or shared types from `src/common/types`
4. Never place implementation classes here
5. Prefer method names that describe business integration intent, not transport mechanics
6. Do not expose `AxiosResponse`, SDK client types, raw webhook payloads, or transport result wrappers

Naming:

- File: `{entity}.gateway.ts` in `kebab-case` (e.g. `contact.gateway.ts`, `catalog.gateway.ts`)
- Interface: `{Entity}Gateway` (e.g. `ContactGateway`, `CatalogGateway`)

Good fit: `lead.gateway.ts`, `form.gateway.ts`, `task.gateway.ts`

Bad fit: `pizzeria.gateway.ts` (if pizzeria is a local DB entity — use `repositories/`)

### `exceptions/`

Store domain-specific exception classes.

Rules:

1. Add this folder when the module needs explicit domain errors
2. Use only for business rule violations, invalid transitions, or missing required business state
3. Do not use for HTTP exceptions, timeouts, SDK failures, ORM failures, serialization errors, or other infrastructure errors
4. Translate infrastructure errors in the infra layer (gateway/repository implementations) or in the use case before they become domain exceptions

Naming:

- File: `{error-name}.ts` in `kebab-case` (e.g. `relation-not-found.ts`, `form-not-linked.ts`)
- Class: `{ErrorName} extends DomainException` (e.g. `RelationNotFound`, `FormNotLinked`)

Good fit: `relation-not-found.ts`, `form-not-linked.ts`, `interview-date-not-found.ts`

Bad fit: `api-timeout.ts`, `database-connection-error.ts` (infrastructure errors)

### `di.tokens.ts`

Store domain DI tokens only.

Rules:

1. Export a single `const` object like `RelationDomainDI`
2. Keep tokens focused on domain contracts
3. Do not place unrelated constants here

### `index.ts`

`domain/index.ts` is the public entry point of the domain layer.

Rules:

1. Re-export the public domain API from here
2. Group exports by meaning when the file grows
3. Prefer re-exporting domain items from the module root through `domain/index.ts` instead of deep file paths
4. Treat `domain/index.ts` as the public surface of the domain layer
5. If a symbol is not exported from `domain/index.ts`, treat it as internal
6. Avoid deep imports into another module's `domain/` internals

## Import Rules

Inside `src/modules/{moduleName}/domain/**`, prefer only these imports:

1. Neighbor files from the same module's `domain/`
2. Shared types from `src/common/types`
3. Public exports of another module when a true cross-module domain dependency is required

Forbidden imports:

1. Anything from `infra/**`
2. Anything from `use-cases/**`
3. Controllers, Nest modules, cron classes, or transport adapters
4. Framework or library types such as `@nestjs/*`, `axios`, `typeorm`, `class-validator`, and `class-transformer`
5. Deep imports into another module's internal files when a public export exists
6. Importing from the same module's own `domain/index.ts` or module `index.ts` instead of local domain files

## Boundary Mapping

Mapping belongs at the boundary, not in domain contracts.

1. Webhook payloads, HTTP responses, SDK objects, ORM entities, and DB rows are not domain models
2. Convert those shapes before they enter domain contracts or use cases
3. Do not mirror a transport or persistence shape in `models/` just because it is convenient
4. If a structure keeps transport-specific field names only to match an external system, it belongs outside `models/`
5. Repository and gateway interfaces must expose domain-oriented shapes, not adapter-oriented shapes

## Workflow

When creating or refactoring domain code, follow this order:

1. Search for an existing `model`, `type`, contract, or exception before creating a new file; prefer one canonical name per concept
2. Classify the artifact using the checklist at the top of Folder Rules
3. Verify that imports stay within allowed domain boundaries
4. Check whether a transport or persistence shape must be mapped before it reaches `domain/`
5. Export the public symbol through `domain/index.ts` when it is part of the domain API
6. When refactoring, preserve observable behavior unless the user asked for behavior changes
7. Do not copy an existing structural mistake into new code; move misplaced artifacts when the task justifies it

## Anti-Patterns

These mistakes are not obvious from the rules above:

1. Creating a `repository` for an external API (amoCRM, HH, Pyrus, Avito) or a `gateway` for database access — repositories are for persistence, gateways are for external integrations
2. Using technical method names such as `sendRequest`, `callApi`, `runQuery`, or `executeSql` in domain contracts — prefer business-intent names
3. Using `any`, `unknown`, or `Record<string, unknown>` as a lazy escape hatch in domain contracts
4. Turning infrastructure failures (timeouts, connection errors, SDK exceptions) into domain exceptions — translate them at the boundary
5. Creating duplicate concepts with names like `Lead`, `LeadModel`, `LeadData`, and `LeadPayload` for the same business meaning — prefer one canonical name
