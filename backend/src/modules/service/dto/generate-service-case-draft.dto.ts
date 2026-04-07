import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ServiceCaseMessageDto } from './service-case-message.dto';

export class GenerateServiceCaseDraftDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceCaseMessageDto)
  messages!: ServiceCaseMessageDto[];

  @IsOptional()
  @IsString()
  instruction?: string;
}
