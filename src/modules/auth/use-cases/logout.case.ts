import { Inject, Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import {
  AuthDomainDI,
  Unauthorized,
  type UserCredentials,
  type UserCredsRepository
} from '@modules/auth/domain'
import { LogoutDto } from './dto/logout.dto'

@Injectable()
export class LogoutCase {
  constructor(
    @Inject(AuthDomainDI.UserCredsRepository)
    private readonly credsRepository: UserCredsRepository
  ) {}

  @ValidateDto()
  public async execute({ refreshToken }: LogoutDto): Promise<void> {
    const creds = await this.loadCredentials(refreshToken)

    await this.removeRefreshToken(creds, refreshToken)
  }

  private async loadCredentials(token: string) {
    const creds = await this.credsRepository.findByRefreshToken(token)
    if (!creds) throw new Unauthorized()
    return creds
  }

  private async removeRefreshToken(creds: UserCredentials, tokenValue: string) {
    const remaining = creds.refreshTokens.filter((t) => t.value !== tokenValue)
    if (remaining.length === creds.refreshTokens.length) {
      throw new Unauthorized()
    }

    await this.credsRepository.update({
      ...creds,
      refreshTokens: remaining
    })
  }
}
