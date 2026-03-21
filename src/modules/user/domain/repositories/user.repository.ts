import type { New, Updatable } from '@common/types'
import type { User } from '../models/user'

export interface UserRepository {
  findById(id: string): Promise<User | null>

  findByEmail(email: string): Promise<User | null>

  create(data: New<User>): Promise<User>

  update(id: string, data: Updatable<User>): Promise<User>

  delete(id: string): Promise<void>
}
