import { Inject, Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/decorators'
import {
  AuthDomainDI,
  InvalidCredentials,
  type PasswordHasher,
  type TokenGenerator,
  type UserCredentials,
  type UserCredsRepository,
  type UserTokens
} from '@modules/auth/domain'
import { UserDomainDI, type User, type UserRepository } from '@modules/user/domain'
import { SignInDto } from './dto/sign-in.dto'

@Injectable()
export class SignInCase {
  constructor(
    @Inject(UserDomainDI.UserRepository)
    private readonly userRepository: UserRepository,
    @Inject(AuthDomainDI.UserCredsRepository)
    private readonly userCredsRepository: UserCredsRepository,
    @Inject(AuthDomainDI.PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
    @Inject(AuthDomainDI.TokenGenerator)
    private readonly tokenGenerator: TokenGenerator
  ) {}

  @ValidateDto()
  public async execute(dto: SignInDto): Promise<UserTokens> {
    const user = await this.loadUser(dto.email)
    const creds = await this.loadCredentials(user.id)

    await this.verifyPassword(dto.password, creds.passwordHash)

    return this.createNewSession(user, creds)
  }

  private async loadUser(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email)
    if (!user) throw new InvalidCredentials()
    return user
  }

  private async loadCredentials(userId: string): Promise<UserCredentials> {
    const creds = await this.userCredsRepository.findByUserId(userId)
    if (!creds) throw new InvalidCredentials()
    return creds
  }

  private async verifyPassword(password: string, hash: string): Promise<void> {
    const ok = await this.passwordHasher.verify(password, hash)
    if (!ok) throw new InvalidCredentials()
  }

  private async createNewSession(user: User, creds: UserCredentials): Promise<UserTokens> {
    const accessToken = this.tokenGenerator.generateAccessToken({
      sub: user.id,
      email: user.email
    })
    const refreshToken = this.tokenGenerator.generateRefreshToken()

    await this.userCredsRepository.update({
      ...creds,
      refreshTokens: [...creds.refreshTokens, refreshToken]
    })
    return { accessToken, refreshToken: refreshToken.value }
  }
}
