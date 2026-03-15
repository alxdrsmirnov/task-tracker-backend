import { DomainException } from '@common/exceptions'

export class UserNotFound extends DomainException {
  constructor(userId: string) {
    super(`Пользователь с ID ${userId} не найден`)
  }
}
