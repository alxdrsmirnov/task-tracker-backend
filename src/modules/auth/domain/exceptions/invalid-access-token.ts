import { DomainException } from '@common/domain'

export class InvalidAccessToken extends DomainException {
  constructor() {
    super('Недействительный токен доступа')
  }
}
