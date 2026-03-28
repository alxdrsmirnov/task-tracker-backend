import { Injectable } from '@nestjs/common'
import { parse } from 'zod'
import { PrismaDb } from '@common/infra/prisma'
import { UserCredentialsSchema } from '../schemas'
import type { UserCredentials } from '@modules/auth/domain'
import type { UserCredsRepository } from '@modules/auth/domain'
import type { New } from '@common/types'

@Injectable()
export class UserCredsPrismaRepository implements UserCredsRepository {
  constructor(private readonly prismaDb: PrismaDb) {}

  async findByUserId(userId: string): Promise<UserCredentials | null> {
    const row = await this.prismaDb.db.userCredentials.findFirst({
      where: { userId },
      include: { refreshTokens: true }
    })
    return row ? parse(UserCredentialsSchema, row) : null
  }

  async findByRefreshToken(value: string): Promise<UserCredentials | null> {
    const token = await this.prismaDb.db.refreshToken.findUnique({
      where: { value },
      select: { userCredsId: true }
    })
    if (!token) return null

    const creds = await this.prismaDb.db.userCredentials.findUnique({
      where: { id: token.userCredsId },
      include: { refreshTokens: true }
    })
    return creds ? parse(UserCredentialsSchema, creds) : null
  }

  async create(data: New<UserCredentials>): Promise<UserCredentials> {
    const { userId, passwordHash, refreshTokens } = data

    const created = await this.prismaDb.db.userCredentials.create({
      data: {
        userId,
        passwordHash,
        ...(refreshTokens.length
          ? {
              refreshTokens: { create: refreshTokens }
            }
          : {})
      },
      include: { refreshTokens: true }
    })
    return parse(UserCredentialsSchema, created)
  }

  async update(userCreds: UserCredentials): Promise<UserCredentials> {
    const { id, passwordHash, refreshTokens } = userCreds

    const updated = await this.prismaDb.db.userCredentials.update({
      where: { id },
      data: {
        passwordHash, // TODO: подумать над ID для RefreshToken
        refreshTokens: {
          deleteMany: {},
          ...(refreshTokens.length ? { create: refreshTokens } : {})
        }
      },
      include: { refreshTokens: true }
    })
    return parse(UserCredentialsSchema, updated)
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prismaDb.db.userCredentials.deleteMany({
      where: { userId }
    })
  }
}
