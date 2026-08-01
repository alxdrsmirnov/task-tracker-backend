export const WorkspaceMemberRole = {
  owner: 'owner',
  admin: 'admin',
  member: 'member'
} as const
export type WorkspaceMemberRole = (typeof WorkspaceMemberRole)[keyof typeof WorkspaceMemberRole]

export interface WorkspaceMember {
  workspaceId: string
  userId: string
  role: WorkspaceMemberRole
  joinedAt: Date
}
