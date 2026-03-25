import { DomainException } from '@common/exceptions/domain.exception'

export class InvalidCredentials extends DomainException {
  constructor() {
    super('Неверный email или пароль')
  }
}
