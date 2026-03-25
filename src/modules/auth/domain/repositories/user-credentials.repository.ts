import type { New } from '@common/types'
import type { UserCredentials } from '../models/user-credentials'

export interface UserCredentialsRepository {
  findByUserId(userId: string): Promise<UserCredentials | null>

  create(data: New<UserCredentials>): Promise<UserCredentials>

  deleteByUserId(userId: string): Promise<void>
}
