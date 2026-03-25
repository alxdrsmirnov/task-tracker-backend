export interface UserTokens {
  accessToken: string
  refreshToken: string
}

export interface JwtPayload {
  sub: string
  email: string
}
