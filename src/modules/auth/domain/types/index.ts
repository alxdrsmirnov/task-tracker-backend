export interface UserTokens {
  accessToken: string
  refreshToken: string
}

export interface AccessTokenPayload {
  userId: string
  email: string
}
