import { Module } from '@nestjs/common'
import { WorkspaceDomainDI } from '../domain'
import { WorkspacePrismaRepository } from './prisma/workspace.repository'
import { MemberPrismaRepository } from './prisma/member.repository'

@Module({
  providers: [
    {
      provide: WorkspaceDomainDI.WorkspaceRepository,
      useClass: WorkspacePrismaRepository
    },
    {
      provide: WorkspaceDomainDI.MemberRepository,
      useClass: MemberPrismaRepository
    }
  ],
  exports: [WorkspaceDomainDI.WorkspaceRepository, WorkspaceDomainDI.MemberRepository]
})
export class WorkspaceInfraModule {}
