import { DomainException } from '@common/domain'

export class Unauthorized extends DomainException {
  constructor() {
    super('Unauthorized')
  }
}
