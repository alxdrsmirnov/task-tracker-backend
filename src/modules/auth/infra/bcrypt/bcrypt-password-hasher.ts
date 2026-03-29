import { Injectable } from '@nestjs/common'
import type { PasswordHasher } from '@modules/auth/domain'
import * as bcrypt from 'bcrypt'

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly SALT_ROUNDS = 12

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS)
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}
