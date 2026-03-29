import { DomainException } from '@common/domain'

export class InvalidCredentials extends DomainException {
  constructor() {
    super('Неверный email или пароль')
  }
}
