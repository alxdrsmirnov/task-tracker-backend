import { IsJWT } from 'class-validator'

export class GetMeDto {
  @IsJWT()
  accessToken: string
}
