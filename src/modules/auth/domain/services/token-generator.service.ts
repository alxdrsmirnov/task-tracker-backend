import type { UserTokens } from '../types/auth.types'

export interface TokenGenerator {
  generateTokens(userId: string, email: string): UserTokens
}
