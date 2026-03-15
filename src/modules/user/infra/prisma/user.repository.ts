import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma/prisma.service'
import type { User, UserRepository } from '../../domain'
import type { New } from '@common/types'

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async create(data: New<User>): Promise<User> {
    return this.prisma.user.create({ data })
  }
}
