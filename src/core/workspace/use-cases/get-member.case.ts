import { Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/decorators'
import { MemberRepository } from '../domain/repositories/member.repository'
import { Unauthorized } from '@modules/auth/domain'
import { GetMemberDto } from './dto/get-member.dto'
import type { WorkspaceMember } from '../domain/models/workspace-member'

@Injectable()
export class GetMemberCase {
  constructor(private readonly memberRepository: MemberRepository) {}

  @ValidateDto()
  public async execute(dto: GetMemberDto): Promise<WorkspaceMember> {
    const member = await this.memberRepository.find(dto.workspaceId, dto.userId)
    if (!member) throw new Unauthorized()
    return member
  }
}
