import { Injectable } from '@nestjs/common'
import type { PasswordHasher } from '../../domain'
import * as bcrypt from 'bcrypt'

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly SALT_ROUNDS = 12

  async hash(password: string) {
    return await bcrypt.hash(password, this.SALT_ROUNDS)
  }

  async verify(password: string, hash: string) {
    return await bcrypt.compare(password, hash)
  }
}
