import { Module } from '@nestjs/common'
import { WorkspaceDomainModule } from './domain/workspace.domain.module'
import { GetMemberCase } from './use-cases'

@Module({
  imports: [WorkspaceDomainModule],
  providers: [GetMemberCase],
  exports: [GetMemberCase, WorkspaceDomainModule]
})
export class WorkspaceModule {}
