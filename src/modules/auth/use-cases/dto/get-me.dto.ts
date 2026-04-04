import { IsString } from 'class-validator'

export class GetMeDto {
  @IsString()
  accessToken: string
}
