import { Module } from '@nestjs/common'
import { WorkspaceInfraModule } from './infra/workspace.infra.module'
import { GetMemberCase } from './use-cases'

@Module({
  imports: [WorkspaceInfraModule],
  providers: [GetMemberCase],
  exports: [GetMemberCase]
})
export class WorkspaceModule {}
