import type { New } from '@common/domain'
import type { UserCredentials } from '../models/user-credentials'

export interface UserCredsRepository {
  findByUserId(userId: string): Promise<UserCredentials | null>

  findByRefreshToken(token: string): Promise<UserCredentials | null>

  create(data: New<UserCredentials>): Promise<UserCredentials>

  update(userCreds: UserCredentials): Promise<UserCredentials>

  deleteByUserId(userId: string): Promise<void>
}
