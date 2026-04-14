import { Injectable } from '@nestjs/common'
import { PrismaConnector } from './prisma.connector'
import { TransactionContext } from './transaction-context'
import type { Prisma } from '@prisma/client'

@Injectable()
export class TransactionRunner {
  constructor(
    private readonly prisma: PrismaConnector,
    private readonly trxContext: TransactionContext<Prisma.TransactionClient>
  ) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.trxContext.get() !== undefined) {
      throw new Error('Вложенные транзакции не поддерживаются')
    }

    return this.prisma.$transaction(async (tx) => {
      this.trxContext.set(tx)
      try {
        return await work()
      } finally {
        this.trxContext.clear()
      }
    })
  }
}
