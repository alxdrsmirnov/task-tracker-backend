import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma'
import type { New } from '@common/types'
import type { UserCredentials } from '../models/user-credentials'

@Injectable()
export class UserCredentialsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserCredentials | null> {
    return this.prisma.db.userCredentials.findFirst({
      where: { userId },
      include: { refreshTokens: true }
    })
  }

  async findByRefreshToken(value: string): Promise<UserCredentials | null> {
    const token = await this.prisma.db.refreshToken.findUnique({
      where: { value },
      select: { userCredsId: true }
    })
    if (!token) return null

    return this.prisma.db.userCredentials.findUnique({
      where: { id: token.userCredsId },
      include: { refreshTokens: true }
    })
  }

  async create(data: New<UserCredentials>): Promise<UserCredentials> {
    const { userId, passwordHash, refreshTokens } = data

    return this.prisma.db.userCredentials.create({
      data: {
        userId,
        passwordHash,
        ...(refreshTokens.length ? { refreshTokens: { create: refreshTokens } } : {})
      },
      include: { refreshTokens: true }
    })
  }

  async update(userCreds: UserCredentials): Promise<UserCredentials> {
    const { id, passwordHash, refreshTokens } = userCreds

    return this.prisma.db.userCredentials.update({
      where: { id },
      data: {
        passwordHash,
        refreshTokens: {
          deleteMany: {},
          ...(refreshTokens.length ? { create: refreshTokens } : {})
        }
      },
      include: { refreshTokens: true }
    })
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.db.userCredentials.deleteMany({
      where: { userId }
    })
  }
}
