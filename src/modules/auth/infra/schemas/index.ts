import { z } from 'zod'
import type { UserCredentials, RefreshToken } from '@modules/auth/domain'

export const RefreshTokenSchema = z.object({
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date()
}) satisfies z.ZodType<RefreshToken>

export const UserCredentialsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  passwordHash: z.string(),
  refreshTokens: z.array(RefreshTokenSchema)
}) satisfies z.ZodType<UserCredentials>
