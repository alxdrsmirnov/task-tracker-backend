import { Module } from '@nestjs/common'
import { AuthModule } from '@core/auth/auth.module'
import { UserModule } from '@core/user/user.module'
import { WorkspaceModule } from '@core/workspace/workspace.module'
import { AuthController } from './controllers/auth.controller'

@Module({
  imports: [AuthModule, UserModule, WorkspaceModule],
  controllers: [AuthController]
})
export class HttpModule {}
