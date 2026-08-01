import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common'
import { DtoFailed } from '@common/exceptions'
import { Response } from 'express'

@Catch(DtoFailed)
export class DtoValidationFailedFilter implements ExceptionFilter {
  catch(exception: DtoFailed, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      errors: exception.errors
    })
  }
}
