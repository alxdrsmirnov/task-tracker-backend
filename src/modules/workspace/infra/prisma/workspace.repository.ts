import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma'
import type { New, Updatable } from '@common/types'
import type { Workspace, WorkspaceRepository } from '@modules/workspace/domain'

@Injectable()
export class WorkspacePrismaRepository implements WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { id } })
  }

  create(data: New<Workspace>): Promise<Workspace> {
    return this.prisma.workspace.create({ data })
  }

  update(id: string, data: Updatable<Workspace>): Promise<Workspace> {
    return this.prisma.workspace.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workspace.delete({ where: { id } })
  }
}
