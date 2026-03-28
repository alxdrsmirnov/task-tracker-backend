import { Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'
import type { Prisma } from '@prisma/client'

@Injectable()
export class PrismaTrxContext {
  constructor(private readonly cls: ClsService) {}

  private readonly TRX_KEY = Symbol('PrismaTransactionKey')

  set(trxClient: Prisma.TransactionClient) {
    this.cls.set(this.TRX_KEY, trxClient)
  }

  get(): Prisma.TransactionClient | undefined {
    return this.cls.get(this.TRX_KEY)
  }

  clear() {
    this.cls.set(this.TRX_KEY, undefined)
  }
}
