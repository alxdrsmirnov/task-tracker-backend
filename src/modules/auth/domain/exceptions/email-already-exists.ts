import { DomainException } from '@common/domain'

export class EmailAlreadyExists extends DomainException {
  constructor(email: string) {
    super(`Пользователь с email ${email} уже зарегистрирован`)
  }
}
