import { HttpStatus, Module } from '@nestjs/common'
import { DomainExceptionFilter } from '@http/filters'
import { UserDomainModule } from '@modules/user/domain/user.domain.module'
import { WorkspaceDomainModule } from '@modules/workspace/domain/workspace.domain.module'
import { AuthDomainModule } from './domain/auth.domain.module'
import { EmailAlreadyExists, InvalidCredentials, Unauthorized } from './domain'
import { GetMeCase } from './use-cases/get-me.case'
import { LogoutCase } from './use-cases/logout.case'
import { RefreshTokensCase } from './use-cases/refresh-tokens.case'
import { SignInCase } from './use-cases/sign-in.case'
import { SignUpCase } from './use-cases/sign-up.case'

DomainExceptionFilter.register(EmailAlreadyExists, HttpStatus.CONFLICT)
DomainExceptionFilter.register(InvalidCredentials, HttpStatus.UNAUTHORIZED)
DomainExceptionFilter.register(Unauthorized, HttpStatus.UNAUTHORIZED)

const useCases = [SignUpCase, SignInCase, RefreshTokensCase, LogoutCase, GetMeCase]

@Module({
  imports: [AuthDomainModule, UserDomainModule, WorkspaceDomainModule],
  providers: useCases,
  exports: [...useCases, AuthDomainModule]
})
export class AuthModule {}
