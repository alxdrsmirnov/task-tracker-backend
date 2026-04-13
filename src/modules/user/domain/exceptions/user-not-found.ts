import { DomainException } from '@common/domain'

export class UserNotFound extends DomainException {
  constructor() {
    super('Пользователь не найден')
  }
}
