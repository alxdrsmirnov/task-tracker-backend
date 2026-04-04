import { Inject, Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import { AuthDomainDI, InvalidAccessToken, type TokenCodec } from '@modules/auth/domain'
import { UserDomainDI, type User, type UserRepository } from '@modules/user/domain'
import { GetMeDto } from './dto/get-me.dto'

@Injectable()
export class GetMeCase {
  constructor(
    @Inject(AuthDomainDI.TokenCodec)
    private readonly tokenCodec: TokenCodec,
    @Inject(UserDomainDI.UserRepository)
    private readonly userRepository: UserRepository
  ) {}

  @ValidateDto()
  public async execute(dto: GetMeDto): Promise<User> {
    const { userId } = this.tokenCodec.verifyAccessToken(dto.accessToken)

    const user = await this.userRepository.findById(userId)
    if (!user) throw new InvalidAccessToken()
    return user
  }
}
