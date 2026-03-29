import { DomainException } from '@common/domain'

export class InvalidRefreshToken extends DomainException {
  constructor() {
    super('Недействительный refresh token')
  }
}
