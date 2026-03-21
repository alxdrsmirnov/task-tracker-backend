export const WorkspaceMemberRole = {
  Owner: 'owner',
  Admin: 'admin',
  Member: 'member'
} as const

export type WorkspaceMemberRole = (typeof WorkspaceMemberRole)[keyof typeof WorkspaceMemberRole]
