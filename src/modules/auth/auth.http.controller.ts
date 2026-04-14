import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GetMeCase } from './use-cases/get-me.case'
import { RefreshTokensCase } from './use-cases/refresh-tokens.case'
import { LogoutCase } from './use-cases/logout.case'
import { SignInCase } from './use-cases/sign-in.case'
import { SignUpCase } from './use-cases/sign-up.case'
import { SignInDto } from './use-cases/dto/sign-in.dto'
import { SignUpDto } from './use-cases/dto/sign-up.dto'
import type { CookieOptions, Request, Response } from 'express'
import type { User } from '@prisma/client'
import type { UserTokens } from './infra/types'

@Controller('auth')
export class AuthHttpController {
  constructor(
    private readonly config: ConfigService,
    private readonly signUpCase: SignUpCase,
    private readonly signInCase: SignInCase,
    private readonly refreshCase: RefreshTokensCase,
    private readonly logoutCase: LogoutCase,
    private readonly getMeCase: GetMeCase
  ) {
    const isProd = this.config.getOrThrow<string>('NODE_ENV') === 'production'
    const maxAge = +this.config.getOrThrow<string>('TOKENS_COOKIE_MAX_AGE')

    this.cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge
    }
  }

  @Get('me')
  async me(@Req() req: Request): Promise<User> {
    const accessToken = String(req.cookies['accessToken'] ?? '')
    return this.getMeCase.execute({ accessToken })
  }

  @Post('sign-up')
  async signUp(@Body() body: SignUpDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.signUpCase.execute(body)
    this.setTokensCookie(res, tokens)
  }

  @Post('sign-in')
  async signIn(@Body() body: SignInDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.signInCase.execute(body)
    this.setTokensCookie(res, tokens)
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = String(req.cookies['refreshToken'] ?? '')
    const tokens = await this.refreshCase.execute({ refreshToken })
    this.setTokensCookie(res, tokens)
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = String(req.cookies['refreshToken'] ?? '')
    await this.logoutCase.execute({ refreshToken })
    this.clearTokensCookies(res)
  }

  private readonly cookieOptions: CookieOptions

  private setTokensCookie(res: Response, tokens: UserTokens) {
    res.cookie('accessToken', tokens.accessToken, this.cookieOptions)
    res.cookie('refreshToken', tokens.refreshToken, this.cookieOptions)
  }

  private clearTokensCookies(res: Response) {
    res.clearCookie('accessToken', this.cookieOptions)
    res.clearCookie('refreshToken', this.cookieOptions)
  }
}
