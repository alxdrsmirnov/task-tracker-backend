import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DomainExceptionFilter, DtoValidationFailedFilter } from './common/api/http/filters'
import cookieParser from 'cookie-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')
  app.useGlobalFilters(new DomainExceptionFilter(), new DtoValidationFailedFilter())
  app.use(cookieParser())

  const nodeEnv = config.getOrThrow<string>('NODE_ENV')
  const isDev = nodeEnv === 'development'

  app.enableCors({
    origin: isDev, // TODO: для продакшена нужно будет указать конкретный домен
    credentials: true
  })

  const port = config.getOrThrow<string>('PORT')
  await app.listen(Number(port))
}
void bootstrap()
