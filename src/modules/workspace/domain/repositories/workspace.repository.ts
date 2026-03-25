import type { New } from '@common/types'
import type { Workspace } from '../models/workspace'

export interface WorkspaceRepository {
  findById(id: string): Promise<Workspace | null>

  create(data: New<Workspace>): Promise<Workspace>

  update(workspace: Workspace): Promise<Workspace>

  delete(id: string): Promise<void>
}
