import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DomainExceptionFilter, DtoValidationFailedFilter } from './common/http/filters'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  app.useGlobalFilters(new DomainExceptionFilter(), new DtoValidationFailedFilter())

  const port = Number(config.get('PORT')) || 3000
  await app.listen(port)
}
void bootstrap()
