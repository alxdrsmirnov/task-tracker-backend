export const AuthDomainDI = {
  UserCredsRepository: Symbol('USER_CREDENTIALS_REPOSITORY'),
  PasswordHasher: Symbol('PASSWORD_HASHER'),
  TokenGenerator: Symbol('TOKEN_GENERATOR')
} as const
