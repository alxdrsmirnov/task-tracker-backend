import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common'
import { DtoValidationFailed } from '../exceptions/dto-validation-failed'
import { Response } from 'express'

@Catch(DtoValidationFailed)
export class DtoValidationFailedFilter implements ExceptionFilter {
  catch(exception: DtoValidationFailed, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      errors: exception.errors
    })
  }
}
