import { DomainException } from '@common/exceptions'

export class UserNotFound extends DomainException {
  constructor(userId: string) {
    super({
      code: 'USER_NOT_FOUND',
      message: `Пользователь с id=${userId} не найден`,
      metadata: { userId }
    })
  }
}
