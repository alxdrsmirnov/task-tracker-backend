import { z } from 'zod'

export const WorkspaceMemberRole = {
  owner: 'owner',
  admin: 'admin',
  member: 'member'
} as const

export type WorkspaceMemberRole = (typeof WorkspaceMemberRole)[keyof typeof WorkspaceMemberRole]

export const WorkspaceMemberSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
  joinedAt: z.coerce.date()
})

export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>
