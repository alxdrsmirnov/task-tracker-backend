import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import type { UserTokens } from './domain'
import { LogoutCase } from './use-cases/logout.case'
import { RefreshTokensCase } from './use-cases/refresh-tokens.case'
import { SignInCase } from './use-cases/sign-in.case'
import { SignUpCase } from './use-cases/sign-up.case'
import { LogoutDto } from './use-cases/dto/logout.dto'
import { RefreshTokensDto } from './use-cases/dto/refresh-tokens.dto'
import { SignInDto } from './use-cases/dto/sign-in.dto'
import { SignUpDto } from './use-cases/dto/sign-up.dto'

@Controller('auth')
export class AuthHttpController {
  constructor(
    private readonly signUpCase: SignUpCase,
    private readonly signInCase: SignInCase,
    private readonly refreshCase: RefreshTokensCase,
    private readonly logoutCase: LogoutCase
  ) {}

  @Post('sign-up')
  signUp(@Body() body: SignUpDto): Promise<UserTokens> {
    return this.signUpCase.execute(body)
  }

  @Post('sign-in')
  signIn(@Body() body: SignInDto): Promise<UserTokens> {
    return this.signInCase.execute(body)
  }

  @Post('refresh')
  refresh(@Body() body: RefreshTokensDto): Promise<UserTokens> {
    return this.refreshCase.execute(body)
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() body: LogoutDto): Promise<void> {
    return this.logoutCase.execute(body)
  }
}
