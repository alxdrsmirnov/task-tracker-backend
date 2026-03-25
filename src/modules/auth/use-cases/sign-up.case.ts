import { Inject, Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/decorators'
import {
  AuthDomainDI,
  EmailAlreadyExists,
  type PasswordHasher,
  type TokenGenerator,
  type UserCredsRepository,
  type UserTokens
} from '@modules/auth/domain'
import { UserDomainDI, type UserRepository } from '@modules/user/domain'
import { SignUpDto } from './dto/sign-up.dto'
import type { User } from '@modules/user/domain'

@Injectable()
export class SignUpCase {
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
  public async execute(dto: SignUpDto): Promise<UserTokens> {
    await this.ensureEmailNotTaken(dto.email)

    const user = await this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      avatarUrl: null,
      lastWorkspaceId: null
    })
    const hash = await this.passwordHasher.hash(dto.password)

    return this.createCredentials(user, hash)
  }

  private async ensureEmailNotTaken(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email)
    if (existing) throw new EmailAlreadyExists(email)
  }

  private async createCredentials(user: User, passwordHash: string): Promise<UserTokens> {
    const accessToken = this.tokenGenerator.generateAccessToken({
      sub: user.id,
      email: user.email
    })
    const refreshToken = this.tokenGenerator.generateRefreshToken()

    await this.userCredsRepository.create({
      userId: user.id,
      passwordHash,
      refreshTokens: [refreshToken]
    })
    return { accessToken, refreshToken: refreshToken.value }
  }
}
