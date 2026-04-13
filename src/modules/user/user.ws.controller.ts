import { Injectable } from '@nestjs/common'
import type { User } from './domain'
import { GetUserCase } from './use-cases'

@Injectable()
export class UserWsController {
  constructor(private readonly getUserCase: GetUserCase) {}

  me(userId: string): Promise<User> {
    return this.getUserCase.execute({ userId })
  }
}
