import type { New, Updatable } from '@common/types'
import type { WorkspaceMember } from '../models/workspace-member'

export interface MemberRepository {
  find(workspaceId: string, userId: string): Promise<WorkspaceMember | null>

  listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]>

  listByUserId(userId: string): Promise<WorkspaceMember[]>

  create(data: New<WorkspaceMember>): Promise<WorkspaceMember>

  update(
    workspaceId: string,
    userId: string,
    data: Updatable<WorkspaceMember>
  ): Promise<WorkspaceMember>

  delete(workspaceId: string, userId: string): Promise<void>
}
