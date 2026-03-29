import { Injectable } from '@nestjs/common'
import { parse } from 'zod'
import { PrismaDb } from '@common/infra/prisma'
import { WorkspaceSchema } from '../schemas'
import type { Workspace, WorkspaceRepository } from '@modules/workspace/domain'
import type { New } from '@common/domain'

@Injectable()
export class WorkspacePrismaRepository implements WorkspaceRepository {
  constructor(private readonly prismaDb: PrismaDb) {}

  async findById(id: string): Promise<Workspace | null> {
    const row = await this.prismaDb.db.workspace.findUnique({ where: { id } })
    return row ? parse(WorkspaceSchema, row) : null
  }

  async create(data: New<Workspace>): Promise<Workspace> {
    const created = await this.prismaDb.db.workspace.create({ data })
    return parse(WorkspaceSchema, created)
  }

  async update(workspace: Workspace): Promise<Workspace> {
    const { id, ...data } = workspace
    const updated = await this.prismaDb.db.workspace.update({ where: { id }, data })
    return parse(WorkspaceSchema, updated)
  }

  async delete(id: string): Promise<void> {
    await this.prismaDb.db.workspace.delete({ where: { id } })
  }
}
