export class DtoValidationFailed extends Error {
  public readonly errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>) {
    super('Валидация DTO не прошла')
    this.errors = errors
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
