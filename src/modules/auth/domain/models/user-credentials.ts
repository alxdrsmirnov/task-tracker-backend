export interface UserCredentials {
  id: string
  userId: string
  passwordHash: string
  refreshTokens: RefreshToken[]
}

export interface RefreshToken {
  id: string
  token: string
  expiresAt: Date
  createdAt: Date
}
