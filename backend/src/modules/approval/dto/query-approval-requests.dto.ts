import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryApprovalRequestsDto {
  @IsOptional()
  @IsIn(['all', 'my', 'pending', 'processed'])
  view?: 'all' | 'my' | 'pending' | 'processed';

  @IsOptional()
  @IsString()
  keyword?: string;
}
