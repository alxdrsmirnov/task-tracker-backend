export interface RefreshToken {
  id: string
  userCredsId: string
  token: string
  expiresAt: Date
  createdAt: Date
}
