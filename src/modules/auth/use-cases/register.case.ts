import { Injectable, Inject } from '@nestjs/common'
import { ValidateDto } from '@common/decorators'
import { UserDomainDI, type UserRepository } from '@modules/user'
import { WorkspaceDomainDI, type WorkspaceRepository } from '@modules/workspace'
import { AuthDomainDI, EmailAlreadyExists } from '../domain'
import type { AuthUserRepository, UserTokens } from '../domain'
import type { PasswordHasher, TokenGenerator } from '../domain'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class RegisterCase {
  constructor(
    @Inject(UserDomainDI.REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(AuthDomainDI.AUTH_USER_REPOSITORY)
    private readonly authRepo: AuthUserRepository,
    @Inject(WorkspaceDomainDI.REPOSITORY)
    private readonly workspaceRepo: WorkspaceRepository,
    @Inject(AuthDomainDI.PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(AuthDomainDI.TOKEN_GENERATOR)
    private readonly tokenGenerator: TokenGenerator
  ) {}

  @ValidateDto()
  public async execute(dto: RegisterDto): Promise<UserTokens> {
    await this.ensureEmailNotTaken(dto.email)

    const user = await this.createUser(dto)
    await this.createUserCredentials(user.id, dto.password)

    await this.createDefaultWorkspace(user.id, dto.name)

    return this.tokenGenerator.generateTokens(user.id, user.email)
  }

  private async ensureEmailNotTaken(email: string) {
    const existing = await this.userRepo.findByEmail(email)
    if (existing) {
      throw new EmailAlreadyExists(email)
    }
  }

  private async createUser(dto: RegisterDto) {
    return this.userRepo.create({
      email: dto.email,
      name: dto.name,
      avatarUrl: null
    })
  }

  private async createUserCredentials(userId: string, password: string) {
    const passwordHash = await this.passwordHasher.hash(password)
    await this.authRepo.createCredentials({
      userId,
      passwordHash
    })
  }

  private async createDefaultWorkspace(userId: string, userName: string) {
    const workspace = await this.workspaceRepo.create({
      name: `${userName}'s Workspace`,
      createdBy: userId,
      slug: ''
    })

    await this.workspaceRepo.addMember({
      workspaceId: workspace.id,
      userId,
      role: 'owner',
      joinedAt: new Date()
    })
  }
}
