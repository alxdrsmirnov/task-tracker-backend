import type { RefreshToken } from '../models/user-credentials'
import type { AccessTokenPayload } from '../types/auth.types'

export interface TokenCodec {
  generateAccessToken(payload: AccessTokenPayload): string

  verifyAccessToken(token: string): AccessTokenPayload

  generateRefreshToken(): RefreshToken
}
