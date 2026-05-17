export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
  lastWorkspaceId: string | null
  createdAt: Date
  updatedAt: Date
}
