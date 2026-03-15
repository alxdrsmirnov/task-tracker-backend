import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DtoValidationFailedFilter } from './common/filters/dto-validation-failed.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalFilters(new DtoValidationFailedFilter())

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
