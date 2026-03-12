import { Module } from '@nestjs/common'
import { AuthHttpController } from './auth.http.controller'

@Module({
  imports: [],
  providers: [],
  controllers: [AuthHttpController]
})
export class AuthModule {}
