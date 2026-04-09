import { IsNotEmpty, IsString } from 'class-validator'

export class GetMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  workspaceId: string
}
