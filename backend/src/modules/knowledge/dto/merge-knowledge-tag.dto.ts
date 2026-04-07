import { IsString } from 'class-validator';

export class MergeKnowledgeTagDto {
  @IsString()
  target_tag_id!: string;
}
