import type { RefreshToken } from '../models/user-credentials'
import type { JwtPayload } from '../types/auth.types'

export interface TokenGenerator {
  generateAccessToken(payload: JwtPayload): string

  generateRefreshToken(): RefreshToken
}
