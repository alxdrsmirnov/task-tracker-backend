import { Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import { MemberRepository } from '../infra/repositories/member.repository'
import { Unauthorized } from '@modules/auth/domain/exceptions/unauthorized'
import { GetMemberDto } from './dto/get-member.dto'
import type { WorkspaceMember } from '@prisma/client'

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
