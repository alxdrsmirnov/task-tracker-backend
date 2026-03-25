export const AuthDomainDI = {
  UserCredentialsRepository: Symbol('USER_CREDENTIALS_REPOSITORY'),
  RefreshTokenRepository: Symbol('REFRESH_TOKEN_REPOSITORY')
} as const
