import { IsString } from 'class-validator';

export class PreviewPromptDto {
  @IsString()
  content!: string;

  @IsString()
  test_conversation!: string;
}
