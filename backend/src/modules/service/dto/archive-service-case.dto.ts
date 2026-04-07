import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ServiceCaseMessageDto } from './service-case-message.dto';

export class ArchiveServiceCaseDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceCaseMessageDto)
  messages!: ServiceCaseMessageDto[];

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  category_name?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
