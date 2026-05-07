import { Module } from '@nestjs/common'
import { AuthModule } from '@modules/auth/auth.module'
import { UserModule } from '@modules/user/user.module'
import { WorkspaceModule } from '@modules/workspace/workspace.module'
import { AuthController } from './controllers/auth.controller'

@Module({
  imports: [AuthModule, UserModule, WorkspaceModule],
  controllers: [AuthController]
})
export class HttpModule {}
