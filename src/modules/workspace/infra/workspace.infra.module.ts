import { Module } from '@nestjs/common'
import { WorkspaceRepository } from './repositories/workspace.repository'
import { MemberRepository } from './repositories/member.repository'

@Module({
  providers: [WorkspaceRepository, MemberRepository],
  exports: [WorkspaceRepository, MemberRepository]
})
export class WorkspaceInfraModule {}
