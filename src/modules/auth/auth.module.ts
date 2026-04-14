import { HttpStatus, Module } from '@nestjs/common'
import { DomainExceptionFilter } from '@common/http/filters'
import { UserInfraModule } from '@modules/user/infra/user.infra.module'
import { WorkspaceInfraModule } from '@modules/workspace/infra/workspace.infra.module'
import { AuthHttpController } from './auth.http.controller'
import { EmailAlreadyExists } from './domain/exceptions/email-already-exists'
import { InvalidCredentials } from './domain/exceptions/invalid-credentials'
import { Unauthorized } from './domain/exceptions/unauthorized'
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
  controllers: [AuthHttpController],
  imports: [AuthInfraModule, UserInfraModule, WorkspaceInfraModule],
  providers: [SignUpCase, SignInCase, RefreshTokensCase, LogoutCase, GetMeCase],
  exports: [GetMeCase]
})
export class AuthModule {}
