import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma'
import type { User, UserRepository } from '@modules/user/domain'
import type { New } from '@common/types'

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  create(data: New<User>): Promise<User> {
    return this.prisma.user.create({ data })
  }

  update(user: User): Promise<User> {
    const { id, ...data } = user
    return this.prisma.user.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }
}
