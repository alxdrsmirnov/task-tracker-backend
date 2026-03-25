import { DomainException } from '@common/exceptions/domain.exception'

export class EmailAlreadyExists extends DomainException {
  constructor(email: string) {
    super(`Пользователь с email ${email} уже зарегистрирован`)
  }
}
