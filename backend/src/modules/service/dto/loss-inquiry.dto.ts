import { IsString, IsOptional, IsIn, IsNotEmpty, IsArray } from 'class-validator';

export class QueryLossInquiriesDto {
  @IsOptional()
  @IsString()
  recovery_state?: string;

  @IsOptional()
  @IsString()
  product_id?: string;
  
  @IsOptional()
  @IsString()
  agent_id?: string;
}

export class UpdateRecoveryStateDto {
  @IsNotEmpty()
  @IsIn(['pending', 'recovering', 'recovered'])
  recovery_state: string;

  @IsOptional()
  @IsString()
  recovery_remark?: string;
}
