import { Injectable } from '@nestjs/common'
import { GetUserCase } from './use-cases'
import type { User } from './domain/schemas/user'

@Injectable()
export class UserWsController {
  constructor(private readonly getUserCase: GetUserCase) {}

  async me(userId: string): Promise<User> {
    return this.getUserCase.execute({ userId })
  }
}
