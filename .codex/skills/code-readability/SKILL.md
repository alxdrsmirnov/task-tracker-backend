---
name: code-readability
description: "Используй после написания или изменения TypeScript/NestJS-кода и при локальном code review: проверяй control flow, guards, names, helpers, temporaries, imports и visual density без самовольной смены поведения."
---

# Code Readability

Проверяй локальную форму кода после профильного архитектурного skill. Сохраняй observable behavior, business contracts и error semantics, если пользователь не просил изменить их.

## Форма Файла

- Размещай type imports вместе с остальными imports; не используй inline `import('./x').Type`.
- Соблюдай устойчивый порядок: constants/fields, constructor, public methods, protected methods, private methods.
- Используй `param?: Type` вместо `param: Type | undefined`, когда параметр действительно опционален.
- Сохраняй стиль соседнего кода, если он не нарушает правила слоя.
- Не добавляй abstraction только ради уменьшения количества строк.
- Оставляй runtime constant в классе как `private readonly`, если значение принадлежит одному классу; выноси в owner-local constants только для нескольких consumers.

## Control Flow И Guards

- Держи простой guard в одну строку для `return`, `continue` или `throw`.
- Используй block form для ветки с несколькими действиями или meaningful call sequence.
- Оставляй простую builtin-проверку непосредственно в `if`.
- Выноси function result в именованное значение, если оно имеет предметный смысл или делает условие заметно яснее.
- Объединяй вложенные conditions только когда они описывают один исход.
- Используй `!value` только если `0`, `false` и пустая строка не являются валидными значениями.
- Используй `items.length` и `!items.length` для обычной проверки коллекции; оставляй явное сравнение для количественного правила.

## Имена И Temporaries

- Выбирай самое короткое имя, остающееся однозначным в текущем scope.
- Называй метод по действию или инварианту; не повторяй owner context в каждом имени.
- Создавай temporary, когда он даёт предметное имя, исключает повторный вызов или упрощает сложный аргумент.
- Не создавай цепочку одноразовых immutable-переменных без дополнительного смысла.
- Используй object spread только при точном и безопасном совпадении контрактов; перечисляй поля явно при rename, masking, filtering или конфликте ключей.
- Не расширяй return contract без реального consumer; возвращай `Promise<void>`, если результат не используется.

## Helpers И Density

- Выноси helper при ясном предметном имени, повторном использовании, технической подготовке или заметном снижении сложности.
- Не скрывай важные side effects за общим helper name.
- Не создавай mapper без реального преобразования формы.
- Используй пустые строки между фазами, а не между каждым statement.
- Оформляй одинаковые методы симметрично.
- Допускай небольшое повторение, если extraction ухудшает чтение.

## Review

1. Прочитай diff, изменённый метод и соседние методы класса.
2. Примени соответствующий `$common-layer`, `$infra-layer`, `$domains-layer`, `$app-layer` или `$transport-layer`.
3. Упрости control flow, names и intermediate values без изменения поведения.
4. Удали speculative helpers и unused returns.
5. Запусти project lint/typecheck в режиме без переписывания файлов, если это возможно.
