import { IsOptional, IsString } from 'class-validator';

export class ServiceCaseMessageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  sender_type!: string;

  @IsOptional()
  @IsString()
  sender_name?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  sent_at?: string;
}
