import type { New, Updatable } from '@common/types'
import type { Workspace } from '../models/workspace'

export interface WorkspaceRepository {
  find(id: string): Promise<Workspace | null>

  create(data: New<Workspace>): Promise<Workspace>

  update(id: string, data: Updatable<Workspace>): Promise<Workspace>

  delete(id: string): Promise<void>
}
