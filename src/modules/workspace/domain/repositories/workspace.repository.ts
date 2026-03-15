import type { New } from '@common/types'
import type { Workspace } from '../models/workspace'
import type { WorkspaceMember } from '../models/workspace-member'

export interface WorkspaceRepository {
  /** === Workspace operations === */
  findById(id: string): Promise<Workspace | null>

  findBySlug(slug: string): Promise<Workspace | null>

  create(data: New<Workspace>): Promise<Workspace>

  /** === WorkspaceMember operations === */
  addMember(data: New<WorkspaceMember>): Promise<WorkspaceMember>

  findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null>
}
