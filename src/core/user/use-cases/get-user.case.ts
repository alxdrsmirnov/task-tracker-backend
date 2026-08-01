import { Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/decorators'
import { UserNotFound } from '../domain/exceptions/user-not-found'
import { UserRepository } from '../domain/repositories/user.repository'
import { GetUserDto } from './dto/get-user.dto'
import type { User } from '../domain/models/user'

@Injectable()
export class GetUserCase {
  constructor(private readonly userRepository: UserRepository) {}

  @ValidateDto()
  public async execute(dto: GetUserDto): Promise<User> {
    const user = await this.userRepository.findById(dto.userId)
    return user ?? this.throwUserNotFound(dto.userId)
  }

  private throwUserNotFound(userId: string): never {
    throw new UserNotFound(userId)
  }
}
