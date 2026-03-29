import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from './prisma.service'
import { TransactionContext } from './transaction-context'

@Injectable()
export class PrismaDb {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trxContext: TransactionContext<Prisma.TransactionClient>
  ) {}

  get db(): PrismaService | Prisma.TransactionClient {
    return this.trxContext.get() ?? this.prisma
  }
}
