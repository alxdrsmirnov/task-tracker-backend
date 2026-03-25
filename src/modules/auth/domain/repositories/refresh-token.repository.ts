import type { New } from '@common/types'
import type { RefreshToken } from '../models/refresh-token'

export interface RefreshTokenRepository {
  findByToken(token: string): Promise<RefreshToken | null>

  listByUserCredsId(userCredsId: string): Promise<RefreshToken[]>

  create(data: New<RefreshToken>): Promise<RefreshToken>

  delete(id: string): Promise<void>

  deleteByUserCredsId(userCredsId: string): Promise<void>
}
