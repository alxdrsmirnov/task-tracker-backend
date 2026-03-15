import { DomainException } from '@common/exceptions'

export class InvalidCredentials extends DomainException {
  constructor() {
    super('Неверный email или пароль')
  }
}
