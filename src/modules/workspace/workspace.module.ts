import { Module } from '@nestjs/common'
import { WorkspaceInfraModule } from './infra/workspace.infra.module'

@Module({
  imports: [WorkspaceInfraModule]
})
export class WorkspaceModule {}
