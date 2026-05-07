export class DtoFailed extends Error {
  public readonly errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>) {
    super('Валидация UseCase DTO не прошла')
    this.errors = errors
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
