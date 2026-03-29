import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DomainExceptionFilter, DtoValidationFailedFilter } from './common/http/filters'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')
  app.useGlobalFilters(new DomainExceptionFilter(), new DtoValidationFailedFilter())

  const config = app.get(ConfigService)
  const port = config.get<string>('PORT') ?? 3000

  await app.listen(Number(port))
}
void bootstrap()
