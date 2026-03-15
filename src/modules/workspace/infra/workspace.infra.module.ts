import { Module } from '@nestjs/common'
import { PrismaModule } from '@common/infra/prisma/prisma.module'
import { WorkspaceDomainDI } from '../domain/di.tokens'
import { WorkspacePrismaRepository } from './prisma/workspace.repository'

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: WorkspaceDomainDI.REPOSITORY,
      useClass: WorkspacePrismaRepository
    }
  ],
  exports: [WorkspaceDomainDI.REPOSITORY]
})
export class WorkspaceInfraModule {}
