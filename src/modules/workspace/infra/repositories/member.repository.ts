import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma'
import type { WorkspaceMember } from '@prisma/client'
import type { New } from '@common/domain'

@Injectable()
export class MemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return this.prisma.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
  }

  listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.prisma.db.workspaceMember.findMany({ where: { workspaceId } })
  }

  listByUserId(userId: string): Promise<WorkspaceMember[]> {
    return this.prisma.db.workspaceMember.findMany({ where: { userId } })
  }

  create(data: New<WorkspaceMember>): Promise<WorkspaceMember> {
    return this.prisma.db.workspaceMember.create({ data })
  }

  update(member: WorkspaceMember): Promise<WorkspaceMember> {
    const { workspaceId, userId, ...data } = member
    return this.prisma.db.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data
    })
  }

  async delete(workspaceId: string, userId: string): Promise<void> {
    await this.prisma.db.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
  }
}
