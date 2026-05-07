import { DomainException } from '@common/exceptions'

export class EmailAlreadyExists extends DomainException {
  constructor(email: string) {
    super({
      code: 'EMAIL_ALREADY_EXISTS',
      message: `Пользователь с email ${email} уже зарегистрирован`,
      metadata: { email }
    })
  }
}
