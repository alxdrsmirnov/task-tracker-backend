import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DomainExceptionFilter, DtoValidationFailedFilter } from './common/http/filters'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalFilters(new DomainExceptionFilter(), new DtoValidationFailedFilter())

  await app.listen(process.env.PORT ?? 3000)
}
void bootstrap()
