import { Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/decorators'
import { Unauthorized } from '../domain/exceptions/unauthorized'
import { TokenCodec } from '../domain/tools/token-codec'
import { UserRepository } from '@core/user/domain/repositories/user.repository'
import { GetMeDto } from './dto/get-me.dto'
import type { User } from '@core/user/domain'

@Injectable()
export class GetMeCase {
  constructor(
    private readonly tokenCodec: TokenCodec,
    private readonly userRepository: UserRepository
  ) {}

  @ValidateDto()
  public async execute(dto: GetMeDto): Promise<User> {
    const { userId } = this.tokenCodec.verifyAccessToken(dto.accessToken)

    const user = await this.userRepository.findById(userId)
    if (!user) throw new Unauthorized()
    return user
  }
}
