import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsArray,
} from "class-validator";

/**
 * 审核注册申请DTO
 */
export class ApproveRegisterDto {
  @IsString({ message: "申请ID必须是字符串" })
  @IsNotEmpty({ message: "申请ID不能为空" })
  id: string;

  @IsString({ message: "审核状态必须是字符串" })
  @IsNotEmpty({ message: "审核状态不能为空" })
  @IsIn(["approved", "rejected"], {
    message: "审核状态只能是approved或rejected",
  })
  status: "approved" | "rejected";

  @IsOptional()
  @IsString({ message: "拒绝原因必须是字符串" })
  rejectReason?: string;
}

/**
 * 批量审核注册申请DTO
 */
export class BatchApproveRegisterDto {
  @IsArray({ message: "申请ID列表必须是数组" })
  @IsNotEmpty({ message: "申请ID列表不能为空" })
  ids: string[];

  @IsString({ message: "审核状态必须是字符串" })
  @IsNotEmpty({ message: "审核状态不能为空" })
  @IsIn(["approved", "rejected"], {
    message: "审核状态只能是approved或rejected",
  })
  status: "approved" | "rejected";

  @IsOptional()
  @IsString({ message: "拒绝原因必须是字符串" })
  rejectReason?: string;
}
