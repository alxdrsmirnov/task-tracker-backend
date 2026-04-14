import { Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import { TransactionRunner } from '@common/infra/prisma/prisma-trx-runner'
import { EmailAlreadyExists } from '../domain/exceptions/email-already-exists'
import { PasswordHasher } from '../infra/tools/password-hasher'
import { TokenCodec } from '../infra/tools/token-codec'
import { UserCredentialsRepository } from '../infra/repositories/user-credentials.repository'
import { UserRepository } from '@modules/user/infra/repositories/user.repository'
import { WorkspaceRepository } from '@modules/workspace/infra/repositories/workspace.repository'
import { MemberRepository } from '@modules/workspace/infra/repositories/member.repository'
import { SignUpDto } from './dto/sign-up.dto'
import { WorkspaceMemberRole } from '@prisma/client'
import type { User, Workspace } from '@prisma/client'
import type { UserTokens } from '../infra/types'

@Injectable()
export class SignUpCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly memberRepository: MemberRepository,
    private readonly userCredsRepository: UserCredentialsRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenCodec: TokenCodec,
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
      role: WorkspaceMemberRole.owner,
      joinedAt: new Date()
    })
    await this.userRepository.update({ ...user, lastWorkspaceId: workspace.id })
  }

  private async createCredentials(user: User, passwordHash: string) {
    const accessToken = this.tokenCodec.generateAccessToken({
      userId: user.id,
      email: user.email
    })
    const refreshToken = this.tokenCodec.generateRefreshToken()

    await this.userCredsRepository.create({
      userId: user.id,
      passwordHash,
      refreshTokens: [refreshToken]
    })
    return { accessToken, refreshToken: refreshToken.value }
  }
}
