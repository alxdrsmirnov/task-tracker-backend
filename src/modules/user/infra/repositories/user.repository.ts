import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma'
import type { User } from '../../domain/schemas/user'
import type { New } from '@common/domain'

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.db.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.db.user.findUnique({ where: { email } })
  }

  create(data: New<User>): Promise<User> {
    return this.prisma.db.user.create({ data })
  }

  update(user: User): Promise<User> {
    const { id, ...data } = user
    return this.prisma.db.user.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.db.user.delete({ where: { id } })
  }
}
