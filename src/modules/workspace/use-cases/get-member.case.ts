import { Inject, Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import {
  WorkspaceDomainDI,
  type MemberRepository,
  type WorkspaceMember
} from '@modules/workspace/domain'
import { GetMemberDto } from './dto/get-member.dto'
import { Unauthorized } from '@modules/auth'

@Injectable()
export class GetMemberCase {
  constructor(
    @Inject(WorkspaceDomainDI.MemberRepository)
    private readonly memberRepository: MemberRepository
  ) {}

  @ValidateDto()
  public async execute(dto: GetMemberDto): Promise<WorkspaceMember> {
    const member = await this.memberRepository.find(dto.workspaceId, dto.userId)
    if (!member) throw new Unauthorized()
    return member
  }
}
