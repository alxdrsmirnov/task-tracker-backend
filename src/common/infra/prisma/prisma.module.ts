import { Global, Module } from '@nestjs/common'
import { CommonDI } from '../../domain/di.tokens'
import { PrismaDb } from './prisma-db'
import { PrismaService } from './prisma.service'
import { TransactionContext } from './transaction-context'
import { PrismaTrxRunner } from './prisma-trx-runner'

@Global()
@Module({
  providers: [
    PrismaService,
    TransactionContext,
    PrismaDb,
    {
      provide: CommonDI.TransactionRunner,
      useClass: PrismaTrxRunner
    }
  ],
  exports: [PrismaService, TransactionContext, PrismaDb, CommonDI.TransactionRunner]
})
export class PrismaModule {}
