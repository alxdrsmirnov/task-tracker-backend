import { Inject, Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import { UserDomainDI, UserNotFound, type User, type UserRepository } from '@modules/user/domain'
import { GetUserDto } from './dto/get-user.dto'

@Injectable()
export class GetUserCase {
  constructor(
    @Inject(UserDomainDI.UserRepository)
    private readonly userRepository: UserRepository
  ) {}

  @ValidateDto()
  public async execute(dto: GetUserDto): Promise<User> {
    const user = await this.userRepository.findById(dto.userId)
    return user ?? this.throwUserNotFound()
  }

  private throwUserNotFound(): never {
    throw new UserNotFound()
  }
}
