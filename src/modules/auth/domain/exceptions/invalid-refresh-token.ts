import { DomainException } from '@common/exceptions'

export class InvalidRefreshToken extends DomainException {
  constructor() {
    super('Невалидный Refresh Token')
  }
}
