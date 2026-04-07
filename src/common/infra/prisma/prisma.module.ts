import { Global, Module } from '@nestjs/common'
import { CommonDI } from '../../domain/di.tokens'
import { PrismaService } from './prisma.service'
import { PrismaConnector } from './prisma.connector'
import { TransactionContext } from './transaction-context'
import { PrismaTrxRunner } from './prisma-trx-runner'

@Global()
@Module({
  providers: [
    PrismaConnector,
    TransactionContext,
    PrismaService,
    {
      provide: CommonDI.TransactionRunner,
      useClass: PrismaTrxRunner
    }
  ],
  exports: [PrismaConnector, TransactionContext, PrismaService, CommonDI.TransactionRunner]
})
export class PrismaModule {}
