import { DomainException } from '@common/exceptions'

export class Unauthorized extends DomainException {
  constructor() {
    super({
      code: 'UNAUTHORIZED',
      message: 'Не авторизован'
    })
  }
}
