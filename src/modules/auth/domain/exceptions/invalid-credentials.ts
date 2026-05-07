import { DomainException } from '@common/exceptions'

export class InvalidCredentials extends DomainException {
  constructor() {
    super({
      code: 'INVALID_CREDENTIALS',
      message: 'Неверный email или пароль'
    })
  }
}
