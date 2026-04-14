import { Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import { Unauthorized } from '../domain/exceptions/unauthorized'
import { TokenCodec } from '../infra/tools/token-codec'
import { UserRepository } from '@modules/user/infra/repositories/user.repository'
import { GetMeDto } from './dto/get-me.dto'
import type { User } from '@prisma/client'

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
