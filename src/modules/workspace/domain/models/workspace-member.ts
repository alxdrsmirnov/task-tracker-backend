import type { WorkspaceMemberRole } from '../types'

export interface WorkspaceMember {
  workspaceId: string
  userId: string
  role: WorkspaceMemberRole
  joinedAt: Date
}
