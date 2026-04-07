import { Injectable } from '@nestjs/common'
import { parse } from 'zod'
import { PrismaService } from '@common/infra/prisma'
import { WorkspaceSchema } from '../schemas'
import type { Workspace, WorkspaceRepository } from '@modules/workspace/domain'
import type { New } from '@common/domain'

@Injectable()
export class WorkspacePrismaRepository implements WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Workspace | null> {
    const row = await this.prisma.db.workspace.findUnique({ where: { id } })
    return row ? parse(WorkspaceSchema, row) : null
  }

  async create(data: New<Workspace>): Promise<Workspace> {
    const created = await this.prisma.db.workspace.create({ data })
    return parse(WorkspaceSchema, created)
  }

  async update(workspace: Workspace): Promise<Workspace> {
    const { id, ...data } = workspace
    const updated = await this.prisma.db.workspace.update({ where: { id }, data })
    return parse(WorkspaceSchema, updated)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.db.workspace.delete({ where: { id } })
  }
}
