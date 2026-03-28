import { HttpStatus, Module } from '@nestjs/common'
import { DomainExceptionFilter } from '@common/filters'
import { UserInfraModule } from '@modules/user'
import { WorkspaceInfraModule } from '@modules/workspace'
import { AuthHttpController } from './auth.http.controller'
import { EmailAlreadyExists, InvalidCredentials, InvalidRefreshToken } from './domain'
import { AuthInfraModule } from './infra/auth.infra.module'
import { LogoutCase } from './use-cases/logout.case'
import { RefreshTokensCase } from './use-cases/refresh-tokens.case'
import { SignInCase } from './use-cases/sign-in.case'
import { SignUpCase } from './use-cases/sign-up.case'

DomainExceptionFilter.register(EmailAlreadyExists, HttpStatus.CONFLICT)
DomainExceptionFilter.register(InvalidCredentials, HttpStatus.UNAUTHORIZED)
DomainExceptionFilter.register(InvalidRefreshToken, HttpStatus.UNAUTHORIZED)

@Module({
  imports: [AuthInfraModule, UserInfraModule, WorkspaceInfraModule],
  providers: [SignUpCase, SignInCase, RefreshTokensCase, LogoutCase],
  controllers: [AuthHttpController]
})
export class AuthModule {}
