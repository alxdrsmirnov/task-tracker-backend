type DomainExceptionParams = {
  code: string
  message: string
  cause?: Error
  metadata?: Record<string, unknown>
}

export abstract class DomainException extends Error {
  constructor(params: DomainExceptionParams) {
    super(params.message, params.cause ? { cause: params.cause } : undefined)

    this.name = new.target.name
    this.code = params.code
    this.metadata = params.metadata
    Error.captureStackTrace?.(this, new.target)
  }

  public readonly code: string
  public readonly metadata?: Record<string, unknown>
}
