import { Injectable } from '@nestjs/common'
import { GetUserCase } from '@modules/user/use-cases'
import type { User } from '@modules/user/domain'

@Injectable()
export class UserWsController {
  constructor(private readonly getUserCase: GetUserCase) {}

  async me(userId: string): Promise<User> {
    return this.getUserCase.execute({ userId })
  }
}
