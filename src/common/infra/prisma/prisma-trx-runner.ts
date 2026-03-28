import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { PrismaTrxContext } from '../../context/prisma-trx-context'
import type { TransactionRunner } from '@common/types'

@Injectable()
export class PrismaTrxRunner implements TransactionRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trxContext: PrismaTrxContext
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
