export type New<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
