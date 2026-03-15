import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate, ValidationError } from 'class-validator'
import { DtoValidationFailed } from '../exceptions/dto-validation-failed'

// Сигнатура оригинального метода execute(), который оборачивает декоратор
type ExecuteMethod = (this: unknown, ...args: unknown[]) => Promise<unknown>

// Конструктор DTO-класса — нужен для plainToInstance,
// который создаёт экземпляр класса из plain object
type DtoConstructor = new (...args: unknown[]) => object

/**
 * Декоратор для автоматической валидации DTO в UseCase.
 *
 * Вешается на метод execute(). Перед вызовом оригинального метода:
 * 1. Определяет класс DTO через Reflect.getMetadata('design:paramtypes', ...)
 *    — TypeScript при компиляции сохраняет типы параметров декорированных методов
 * 2. Преобразует plain object (args[0]) в экземпляр DTO через plainToInstance
 *    — это нужно, чтобы class-validator увидел декораторы на полях
 * 3. Валидирует экземпляр через class-validator
 * 4. При ошибках — бросает DtoValidationFailed с форматированными ошибками
 * 5. При успехе — вызывает оригинальный execute() с валидированным DTO
 *
 * @example
 * class RegisterCase {
 *   @ValidateDto()
 *   public async execute(dto: RegisterDto): Promise<UserTokens> {
 *     // dto уже провалидирован к этому моменту
 *   }
 * }
 */
export function ValidateDto() {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    // descriptor.value — оригинальный метод execute()
    // PropertyDescriptor.value типизирован как `any` в TypeScript,
    // поэтому каст через `as` неизбежен
    const originalMethod = descriptor.value as ExecuteMethod

    // Подменяем execute() обёрткой, которая валидирует DTO перед вызовом
    descriptor.value = async function (...args: unknown[]) {
      const dtoObject = args[0]
      if (!dtoObject || typeof dtoObject !== 'object') {
        throw new DtoValidationFailed({
          dto: ['Параметр "dto" является обязательным для UseCase.execute()']
        })
      }

      // emitDecoratorMetadata: true в tsconfig заставляет TypeScript
      // при компиляции генерировать вызов:
      //   Reflect.defineMetadata('design:paramtypes', [RegisterDto], target, 'execute')
      // Здесь мы читаем эти метаданные, чтобы узнать класс первого параметра.
      // Reflect.getMetadata возвращает `any` — каст типов неизбежен
      const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as
        | unknown[]
        | undefined

      // Первый элемент — конструктор DTO-класса (например, RegisterDto)
      const DtoClass = paramTypes?.[0] as DtoConstructor | undefined
      if (!DtoClass) {
        throw new Error('Не удалось определить класс DTO для валидации параметров UseCase')
      }

      // Преобразуем plain object в экземпляр DTO-класса.
      // Без этого шага class-validator не увидит декораторы (@IsEmail, @MinLength и т.д.),
      // потому что они привязаны к прототипу класса, а не к plain object
      const dtoInstance = plainToInstance(DtoClass, dtoObject, {
        enableImplicitConversion: true,
        exposeDefaultValues: true,
        excludeExtraneousValues: false,
        exposeUnsetFields: false
      })

      // Запускаем валидацию class-validator.
      // whitelist: true — отбрасывает поля, у которых нет декораторов в DTO
      const errors = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: false
      })

      // Если ошибок нет — вызываем оригинальный execute() с валидированным DTO
      if (!errors.length) {
        return originalMethod.call(this, dtoInstance)
      }

      // Форматируем ошибки в { "email": ["must be an email"], "password": ["too short"] }
      const formattedErrors = formatErrors(errors)
      throw new DtoValidationFailed(formattedErrors)
    }

    return descriptor
  }
}

/**
 * Рекурсивно форматирует ошибки валидации в плоскую структуру.
 * Поддерживает вложенные DTO (@ValidateNested): путь через точку — "address.city".
 *
 * @param errors — массив ValidationError от class-validator
 * @param prefix — накопленный путь для вложенных объектов
 * @returns { "field": ["error1", "error2"], "nested.field": ["error3"] }
 */
function formatErrors(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  let result: Record<string, string[]> = {}

  for (const err of errors) {
    // Строим путь: "address" + "city" → "address.city"
    const propertyPath = prefix ? `${prefix}.${err.property}` : err.property

    // constraints — объект { decoratorName: "сообщение об ошибке" }
    if (err.constraints) {
      result[propertyPath] = Object.values(err.constraints)
    }

    // children — вложенные ошибки для @ValidateNested() полей
    if (err.children?.length) {
      result = { ...result, ...formatErrors(err.children, propertyPath) }
    }
  }

  return result
}
