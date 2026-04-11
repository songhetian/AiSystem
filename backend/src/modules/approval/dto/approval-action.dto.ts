import { IsOptional, IsString } from 'class-validator';

export class ApprovalActionDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  target_user_id?: string;
}
