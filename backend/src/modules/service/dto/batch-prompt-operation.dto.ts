import { IsArray, IsString } from 'class-validator';

export class BatchPromptOperationDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
