export type SystemFields = 'id' | 'createdAt' | 'updatedAt'

export type New<T> = Omit<T, SystemFields>

export type Updatable<T> = Partial<New<T>>
