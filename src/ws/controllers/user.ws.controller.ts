import { Injectable } from '@nestjs/common'
import { GetUserCase } from '@core/user/use-cases'
import type { User } from '@core/user/domain'

@Injectable()
export class UserWsController {
  constructor(private readonly getUserCase: GetUserCase) {}

  async me(userId: string): Promise<User> {
    return this.getUserCase.execute({ userId })
  }
}
