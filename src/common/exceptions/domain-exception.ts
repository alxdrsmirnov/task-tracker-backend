/**
 * Базовый класс для всех доменных исключений.
 * Используется для отличия бизнес-ошибок от системных ошибок.
 */
export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
