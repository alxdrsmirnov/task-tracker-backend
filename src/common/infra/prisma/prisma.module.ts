import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { PrismaConnector } from './prisma.connector'
import { TransactionContext } from './transaction-context'
import { TransactionRunner } from './prisma-trx-runner'

@Global()
@Module({
  providers: [PrismaConnector, TransactionContext, PrismaService, TransactionRunner],
  exports: [PrismaConnector, TransactionContext, PrismaService, TransactionRunner]
})
export class PrismaModule {}
