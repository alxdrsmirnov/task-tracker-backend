import { Injectable } from '@nestjs/common'
import { PrismaConnector } from './prisma.connector'
import { TransactionContext } from './transaction-context'
import type { Prisma } from '@prisma/client'

@Injectable()
export class PrismaService {
  constructor(
    private readonly prisma: PrismaConnector,
    private readonly trxContext: TransactionContext<Prisma.TransactionClient>
  ) {}

  get db(): PrismaConnector | Prisma.TransactionClient {
    return this.trxContext.get() ?? this.prisma
  }
}
