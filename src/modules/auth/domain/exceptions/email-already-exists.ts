import { DomainException } from '@common/exceptions'

export class EmailAlreadyExists extends DomainException {
  constructor(email: string) {
    super(`Email ${email} уже занят`)
  }
}
