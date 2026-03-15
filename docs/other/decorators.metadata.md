# Как работает Reflect.getMetadata('design:paramtypes', ...) в декораторах

Механизм состоит из двух частей: компилятор TypeScript + библиотека `reflect-metadata`.

---

## Шаг 1: Компиляция TypeScript (`emitDecoratorMetadata: true`)

Когда в `tsconfig.json` включён `emitDecoratorMetadata`, компилятор для каждого **декорированного** метода/класса/свойства генерирует дополнительные вызовы `__metadata(...)`, сохраняющие информацию о типах.

Исходный TypeScript:

```typescript
class RegisterCase {
  @ValidateDto()
  async execute(dto: RegisterDto): Promise<UserTokens> {
    // ...
  }
}
```

Скомпилированный JavaScript (упрощённо):

```javascript
__decorate([
    ValidateDto(),
    __metadata("design:paramtypes", [RegisterDto]),
    __metadata("design:returntype", Promise)
], RegisterCase.prototype, "execute", null);
```

Компилятор увидел декоратор на методе `execute` и добавил `__metadata`.
`design:paramtypes` содержит массив конструкторов параметров: `[RegisterDto]`.

**Без декоратора на методе — metadata не генерируется.**

---

## Шаг 2: Runtime (reflect-metadata)

Библиотека `reflect-metadata` (`import 'reflect-metadata'`) добавляет в глобальный `Reflect` методы `defineMetadata` / `getMetadata`. Это key-value store, привязанный к объектам и их свойствам.

При загрузке модуля сгенерированный код вызывает:

```javascript
Reflect.defineMetadata(
  "design:paramtypes",
  [RegisterDto],
  RegisterCase.prototype,
  "execute"
)
```

Ссылка на класс `RegisterDto` сохраняется в хранилище `Reflect`.

---

## Шаг 3: Чтение метаданных в декораторе

Когда вызывается `execute(dto)` и срабатывает `ValidateDto`:

```typescript
const DtoClass = Reflect.getMetadata('design:paramtypes', target, propertyKey)?.[0]
// DtoClass === RegisterDto (сам конструктор, не строка)
```

Возвращается ссылка на класс, поэтому можно вызвать `plainToInstance(DtoClass, data)` — он знает, в какой класс преобразовывать.

---

## Ограничения

Сохраняются только ссылки на конструкторы. Сложные типы теряются:

| TypeScript тип | Сохраняется как | Причина |
|----------------|-----------------|---------|
| `RegisterDto` | `RegisterDto` | Класс существует в runtime |
| `string` | `String` | Примитив → обёртка |
| `number` | `Number` | Примитив → обёртка |
| `string \| null` | `Object` | Union не представим |
| `interface Foo` | `Object` | Интерфейсы стираются при компиляции |

Поэтому DTO должен быть **классом**, а не интерфейсом или type alias. Класс существует в runtime, интерфейс — нет.

---

## Аналогия: DI в NestJS

Тот же механизм используется в Dependency Injection NestJS:

```typescript
@Injectable()
class RegisterCase {
  constructor(
    private readonly authRepo: AuthUserRepository,
    private readonly jwtService: JwtService,
  ) {}
}
```

`@Injectable()` заставляет компилятор сгенерировать:

```javascript
__metadata("design:paramtypes", [AuthUserRepository, JwtService])
```

NestJS читает эти метаданные и знает, что инжектить в конструктор. `@ValidateDto()` использует тот же фундамент.
