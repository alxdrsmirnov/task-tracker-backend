import { z } from 'zod'
import { WorkspaceMemberRole } from '@modules/workspace/domain'
import type { Workspace, WorkspaceMember } from '@modules/workspace/domain'

export const WorkspaceMemberSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  role: z.enum(WorkspaceMemberRole),
  joinedAt: z.coerce.date()
}) satisfies z.ZodType<WorkspaceMember>

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  creatorId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
}) satisfies z.ZodType<Workspace>
