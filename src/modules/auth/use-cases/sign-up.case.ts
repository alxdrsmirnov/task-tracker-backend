import { Inject, Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import { CommonDI } from '@common/domain'
import { UserDomainDI } from '@modules/user/domain'
import { AuthDomainDI, EmailAlreadyExists } from '../domain'
import { WorkspaceDomainDI, WorkspaceMemberRole } from '@modules/workspace/domain'
import type { PasswordHasher, TokenGenerator, UserCredsRepository, UserTokens } from '../domain'
import type { Workspace, WorkspaceRepository, MemberRepository } from '@modules/workspace/domain'
import type { User, UserRepository } from '@modules/user/domain'
import type { TransactionRunner } from '@common/domain'
import { SignUpDto } from './dto/sign-up.dto'

@Injectable()
export class SignUpCase {
  constructor(
    @Inject(UserDomainDI.UserRepository)
    private readonly userRepository: UserRepository,
    @Inject(WorkspaceDomainDI.WorkspaceRepository)
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(WorkspaceDomainDI.MemberRepository)
    private readonly memberRepository: MemberRepository,
    @Inject(AuthDomainDI.UserCredsRepository)
    private readonly userCredsRepository: UserCredsRepository,
    @Inject(AuthDomainDI.PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
    @Inject(AuthDomainDI.TokenGenerator)
    private readonly tokenGenerator: TokenGenerator,
    @Inject(CommonDI.TransactionRunner)
    private readonly transaction: TransactionRunner
  ) {}

  @ValidateDto()
  public async execute(dto: SignUpDto): Promise<UserTokens> {
    await this.ensureEmailNotTaken(dto.email)

    const hash = await this.passwordHasher.hash(dto.password)

    return this.transaction.run(async () => {
      const user = await this.createUser(dto)
      const workspace = await this.createWorkspace(user)

      await this.linkUserToWorkspace(user, workspace)

      return this.createCredentials(user, hash)
    })
  }

  private async ensureEmailNotTaken(email: string) {
    const existing = await this.userRepository.findByEmail(email)
    if (existing) throw new EmailAlreadyExists(email)
  }

  private async createUser(dto: SignUpDto) {
    return await this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      avatarUrl: null,
      lastWorkspaceId: null
    })
  }

  private async createWorkspace(user: User) {
    return await this.workspaceRepository.create({
      name: `Пространство ${user.firstName}`,
      creatorId: user.id
    })
  }

  private async linkUserToWorkspace(user: User, workspace: Workspace) {
    await this.memberRepository.create({
      workspaceId: workspace.id,
      userId: user.id,
      role: WorkspaceMemberRole.Owner,
      joinedAt: new Date()
    })
    await this.userRepository.update({ ...user, lastWorkspaceId: workspace.id })
  }

  private async createCredentials(user: User, passwordHash: string) {
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
