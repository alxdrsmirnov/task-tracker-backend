import { Controller, Get, NotImplementedException, Post } from '@nestjs/common'

@Controller('auth')
export class AuthController {
  @Get('me')
  me(): never {
    throw new NotImplementedException('Auth is not implemented')
  }

  @Post('sign-up')
  signUp(): never {
    throw new NotImplementedException('Auth is not implemented')
  }

  @Post('sign-in')
  signIn(): never {
    throw new NotImplementedException('Auth is not implemented')
  }

  @Post('refresh')
  refresh(): never {
    throw new NotImplementedException('Auth is not implemented')
  }

  @Post('logout')
  logout(): never {
    throw new NotImplementedException('Auth is not implemented')
  }
}
