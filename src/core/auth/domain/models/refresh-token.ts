export interface RefreshToken {
  id?: string
  userCredsId?: string
  value: string
  expiresAt: Date
  createdAt: Date
}
