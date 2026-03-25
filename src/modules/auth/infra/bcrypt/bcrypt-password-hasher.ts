import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import type { PasswordHasher } from '@modules/auth/domain'

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private static readonly SALT_ROUNDS = 10

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BcryptPasswordHasher.SALT_ROUNDS)
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}
