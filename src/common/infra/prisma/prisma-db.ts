import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from './prisma.service'
import { PrismaTrxContext } from '../../context/prisma-trx-context'

@Injectable()
export class PrismaDb {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trxContext: PrismaTrxContext
  ) {}

  get db(): PrismaService | Prisma.TransactionClient {
    return this.trxContext.get() ?? this.prisma
  }
}
