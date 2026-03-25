import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma'
import { WorkspaceSchema } from '../schemas'
import { parse } from 'zod'
import type { Workspace, WorkspaceRepository } from '@modules/workspace/domain'
import type { New } from '@common/types'

@Injectable()
export class WorkspacePrismaRepository implements WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Workspace | null> {
    const row = await this.prisma.workspace.findUnique({ where: { id } })
    return row ? parse(WorkspaceSchema, row) : null
  }

  async create(data: New<Workspace>): Promise<Workspace> {
    const created = await this.prisma.workspace.create({ data })
    return parse(WorkspaceSchema, created)
  }

  async update(workspace: Workspace): Promise<Workspace> {
    const { id, ...data } = workspace
    const updated = await this.prisma.workspace.update({ where: { id }, data })
    return parse(WorkspaceSchema, updated)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workspace.delete({ where: { id } })
  }
}
