export const AuthDomainDI = {
  UserCredsRepository: Symbol('USER_CREDENTIALS_REPOSITORY'),
  PasswordHasher: Symbol('PASSWORD_HASHER'),
  TokenCodec: Symbol('TOKEN_CODEC')
} as const
