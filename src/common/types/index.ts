export type SystemFields = 'id' | 'createdAt' | 'updatedAt'

export type New<T> = Omit<T, SystemFields> & {
  createdAt?: Date
  updatedAt?: Date
}
