export type SystemFields = { id: string; createdAt: Date; updatedAt: Date }

export type New<T> = Omit<Required<T>, keyof SystemFields>

export type Updatable<T> = Partial<New<T>>
