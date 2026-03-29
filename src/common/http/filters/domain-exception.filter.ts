import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { DomainException } from '../../domain/exceptions/domain.exception'

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private static readonly registry = new Map<ExceptionClass, HttpStatus>()

  static register(ExceptionClass: ExceptionClass, status: HttpStatus): void {
    DomainExceptionFilter.registry.set(ExceptionClass, status)
  }

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    const status = DomainExceptionFilter.resolveStatus(exception)

    response.status(status).json({
      statusCode: status,
      message: exception.message
    })
  }

  private static resolveStatus(exception: DomainException): HttpStatus {
    for (const [Cls, status] of DomainExceptionFilter.registry) {
      if (exception instanceof Cls) return status
    }
    return HttpStatus.BAD_REQUEST
  }
}

type ExceptionClass = new (...args: never[]) => DomainException
