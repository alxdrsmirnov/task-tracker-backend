import type { New } from '@common/types'
import type { UserCredentials } from '../models/user-credentials'
import type { RefreshToken } from '../models/refresh-token'

export interface AuthUserRepository {
  // UserCredentials
  findCredentialsByUserId(userId: string): Promise<UserCredentials | null>

  createCredentials(data: New<UserCredentials>): Promise<UserCredentials>

  updatePassword(userId: string, passwordHash: string): Promise<void>

  // RefreshToken
  findRefreshToken(token: string): Promise<RefreshToken | null>

  createRefreshToken(data: New<RefreshToken>): Promise<RefreshToken>

  deleteRefreshToken(token: string): Promise<void>

  deleteAllUserRefreshTokens(userCredsId: string): Promise<void>
}
