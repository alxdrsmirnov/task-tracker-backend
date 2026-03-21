import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma'
import type { New, Updatable } from '@common/types'
import type { MemberRepository, WorkspaceMember } from '@modules/workspace/domain'

@Injectable()
export class MemberPrismaRepository implements MemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
  }

  listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.prisma.workspaceMember.findMany({ where: { workspaceId } })
  }

  listByUserId(userId: string): Promise<WorkspaceMember[]> {
    return this.prisma.workspaceMember.findMany({ where: { userId } })
  }

  create(data: New<WorkspaceMember>): Promise<WorkspaceMember> {
    return this.prisma.workspaceMember.create({ data })
  }

  update(
    workspaceId: string,
    userId: string,
    data: Updatable<WorkspaceMember>
  ): Promise<WorkspaceMember> {
    return this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data
    })
  }

  async delete(workspaceId: string, userId: string): Promise<void> {
    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
  }
}
