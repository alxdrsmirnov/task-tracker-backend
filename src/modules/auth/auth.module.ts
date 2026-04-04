import { HttpStatus, Module } from '@nestjs/common'
import { DomainExceptionFilter } from '@common/api/http/filters'
import { UserInfraModule } from '@modules/user'
import { WorkspaceInfraModule } from '@modules/workspace'
import { AuthHttpController } from './auth.http.controller'
import { EmailAlreadyExists, InvalidCredentials, Unauthorized } from './domain'
import { AuthInfraModule } from './infra/auth.infra.module'
import { GetMeCase } from './use-cases/get-me.case'
import { LogoutCase } from './use-cases/logout.case'
import { RefreshTokensCase } from './use-cases/refresh-tokens.case'
import { SignInCase } from './use-cases/sign-in.case'
import { SignUpCase } from './use-cases/sign-up.case'

DomainExceptionFilter.register(EmailAlreadyExists, HttpStatus.CONFLICT)
DomainExceptionFilter.register(InvalidCredentials, HttpStatus.UNAUTHORIZED)
DomainExceptionFilter.register(Unauthorized, HttpStatus.UNAUTHORIZED)

@Module({
  imports: [AuthInfraModule, UserInfraModule, WorkspaceInfraModule],
  providers: [SignUpCase, SignInCase, RefreshTokensCase, LogoutCase, GetMeCase],
  controllers: [AuthHttpController]
})
export class AuthModule {}
