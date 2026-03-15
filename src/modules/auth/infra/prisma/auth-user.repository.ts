import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma/prisma.service'
import type { UserCredentials } from '../../domain/models/user-credentials'
import type { RefreshToken } from '../../domain/models/refresh-token'
import type { AuthUserRepository } from '../../domain/repositories/auth-user.repository'
import type { New } from '@common/types'

@Injectable()
export class AuthUserPrismaRepository implements AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCredentialsByUserId(userId: string): Promise<UserCredentials | null> {
    return this.prisma.userCredentials.findUnique({
      where: { userId }
    })
  }

  async createCredentials(data: New<UserCredentials>): Promise<UserCredentials> {
    return this.prisma.userCredentials.create({ data })
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.userCredentials.update({
      where: { userId },
      data: { passwordHash }
    })
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token }
    })
  }

  async createRefreshToken(data: New<RefreshToken>): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data })
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { token }
    })
  }

  async deleteAllUserRefreshTokens(userCredsId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userCredsId }
    })
  }
}
