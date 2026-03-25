import { Injectable } from '@nestjs/common'
import { parse } from 'zod'
import { PrismaService } from '@common/infra/prisma'
import { WorkspaceMemberSchema } from '../schemas'
import type { MemberRepository, WorkspaceMember } from '@modules/workspace/domain'
import type { New } from '@common/types'

@Injectable()
export class MemberPrismaRepository implements MemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const row = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    return row ? parse(WorkspaceMemberSchema, row) : null
  }

  async listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
    const rows = await this.prisma.workspaceMember.findMany({ where: { workspaceId } })
    return rows.map((row) => parse(WorkspaceMemberSchema, row))
  }

  async listByUserId(userId: string): Promise<WorkspaceMember[]> {
    const rows = await this.prisma.workspaceMember.findMany({ where: { userId } })
    return rows.map((row) => parse(WorkspaceMemberSchema, row))
  }

  async create(data: New<WorkspaceMember>): Promise<WorkspaceMember> {
    const created = await this.prisma.workspaceMember.create({ data })
    return parse(WorkspaceMemberSchema, created)
  }

  async update(
    ids: { workspaceId: string; userId: string },
    data: Pick<WorkspaceMember, 'role'>
  ): Promise<WorkspaceMember> {
    const { workspaceId, userId } = ids
    const updated = await this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data
    })
    return parse(WorkspaceMemberSchema, updated)
  }

  async delete(workspaceId: string, userId: string): Promise<void> {
    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
  }
}
