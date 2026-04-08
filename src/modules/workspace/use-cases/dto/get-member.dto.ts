import { IsUUID } from 'class-validator'

export class GetMemberDto {
  @IsUUID()
  userId: string

  @IsUUID()
  workspaceId: string
}
