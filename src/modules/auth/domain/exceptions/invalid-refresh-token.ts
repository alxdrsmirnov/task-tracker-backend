import { DomainException } from '@common/exceptions/domain.exception'

export class InvalidRefreshToken extends DomainException {
  constructor() {
    super('Недействительный refresh token')
  }
}
