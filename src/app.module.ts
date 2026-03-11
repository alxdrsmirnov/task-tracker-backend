import { Module } from '@nestjs/common'
import { PrismaModule } from './common/infra/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
