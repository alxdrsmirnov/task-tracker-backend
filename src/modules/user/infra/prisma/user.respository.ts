import { Injectable } from '@nestjs/common'
import { PrismaDb } from '@common/infra/prisma'
import type { User, UserRepository } from '@modules/user/domain'
import type { New } from '@common/types'

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prismaDb: PrismaDb) {}

  findById(id: string): Promise<User | null> {
    return this.prismaDb.db.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prismaDb.db.user.findUnique({ where: { email } })
  }

  create(data: New<User>): Promise<User> {
    return this.prismaDb.db.user.create({ data })
  }

  update(user: User): Promise<User> {
    const { id, ...data } = user
    return this.prismaDb.db.user.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prismaDb.db.user.delete({ where: { id } })
  }
}
