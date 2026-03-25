export type SystemFields = 'id' | 'createdAt' | 'updatedAt'

export type New<T> = Omit<T, SystemFields> & {
  createdAt?: Date
  updatedAt?: Date
}

export type Updatable<T extends { id: unknown }> = Partial<New<T>> & Pick<T, 'id'>
