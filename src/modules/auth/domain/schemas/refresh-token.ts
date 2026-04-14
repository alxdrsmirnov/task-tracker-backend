import { z } from 'zod'

export const RefreshTokenSchema = z.object({
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date()
})

export type RefreshToken = z.infer<typeof RefreshTokenSchema>
