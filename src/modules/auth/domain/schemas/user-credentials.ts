import { z } from 'zod'
import { RefreshTokenSchema } from './refresh-token'

export const UserCredentialsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  passwordHash: z.string(),
  refreshTokens: z.array(RefreshTokenSchema)
})

export type UserCredentials = z.infer<typeof UserCredentialsSchema>
