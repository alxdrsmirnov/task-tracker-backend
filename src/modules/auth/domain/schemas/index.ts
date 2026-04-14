import { z } from 'zod'

export const RefreshTokenSchema = z.object({
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date()
})

export const UserCredentialsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  passwordHash: z.string(),
  refreshTokens: z.array(RefreshTokenSchema)
})

export type RefreshToken = z.infer<typeof RefreshTokenSchema>
export type UserCredentials = z.infer<typeof UserCredentialsSchema>
