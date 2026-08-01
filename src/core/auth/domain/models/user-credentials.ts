import type { RefreshToken } from './refresh-token'

export interface UserCredentials {
  id: string
  userId: string
  passwordHash: string
  refreshTokens: RefreshToken[]
}
