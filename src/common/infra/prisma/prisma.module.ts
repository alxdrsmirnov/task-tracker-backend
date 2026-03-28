import { Global, Module } from '@nestjs/common'
import { CommonDI } from '../../di.tokens'
import { PrismaDb } from './prisma-db'
import { PrismaService } from './prisma.service'
import { PrismaTrxContext } from '../../context/prisma-trx-context'
import { PrismaTrxRunner } from './prisma-trx-runner'

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTrxContext,
    PrismaDb,
    {
      provide: CommonDI.TransactionRunner,
      useClass: PrismaTrxRunner
    }
  ],
  exports: [PrismaService, PrismaTrxContext, PrismaDb, CommonDI.TransactionRunner]
})
export class PrismaModule {}
