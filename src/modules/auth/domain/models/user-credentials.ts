export interface UserCredentials {
  id: string
  userId: string
  passwordHash: string
  refreshTokens: RefreshToken[]
}

export interface RefreshToken {
  value: string
  expiresAt: Date
  createdAt: Date
}
