import { Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import { UserNotFound } from '../domain/exceptions/user-not-found'
import { UserRepository } from '../infra/repositories/user.repository'
import { GetUserDto } from './dto/get-user.dto'
import type { User } from '../domain/schemas/user'

@Injectable()
export class GetUserCase {
  constructor(private readonly userRepository: UserRepository) {}

  @ValidateDto()
  public async execute(dto: GetUserDto): Promise<User> {
    const user = await this.userRepository.findById(dto.userId)
    return user ?? this.throwUserNotFound()
  }

  private throwUserNotFound(): never {
    throw new UserNotFound()
  }
}
