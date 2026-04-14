import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma'
import type { Workspace } from '../../domain/schemas/workspace'
import type { New } from '@common/domain'

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Workspace | null> {
    return this.prisma.db.workspace.findUnique({ where: { id } })
  }

  create(data: New<Workspace>): Promise<Workspace> {
    return this.prisma.db.workspace.create({ data })
  }

  update(workspace: Workspace): Promise<Workspace> {
    const { id, ...data } = workspace
    return this.prisma.db.workspace.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.db.workspace.delete({ where: { id } })
  }
}
