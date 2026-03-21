export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string
  lastWorkspaceId: string | null
  createdAt: Date
  updatedAt: Date
}
