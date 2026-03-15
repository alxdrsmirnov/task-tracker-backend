import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma/prisma.service'
import type { Workspace } from '../../domain'
import type { WorkspaceMember } from '../../domain'
import type { WorkspaceRepository } from '../../domain'
import type { New } from '@common/types'

@Injectable()
export class WorkspacePrismaRepository implements WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { id } })
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { slug } })
  }

  async create(data: New<Workspace>): Promise<Workspace> {
    const slug = await this.generateUniqueSlug(data.name)
    return this.prisma.workspace.create({
      data: { ...data, slug }
    })
  }

  async addMember(data: New<WorkspaceMember>): Promise<WorkspaceMember> {
    return this.prisma.workspaceMember.create({ data })
  }

  async findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = this.slugify(name)
    let slug = baseSlug
    let counter = 1

    while (await this.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .substring(0, 50)
  }
}
