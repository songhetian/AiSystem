import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsNotEmpty, IsString } from "class-validator";

/**
 * 批量分配权限 DTO
 */
export class BatchAssignPermissionsDto {
  @ApiProperty({ description: "角色ID列表", type: [String] })
  @IsArray()
  @IsNotEmpty({ message: "角色ID列表不能为空" })
  roleIds: string[];

  @ApiProperty({ description: "权限ID列表", type: [String] })
  @IsArray()
  @IsNotEmpty({ message: "权限ID列表不能为空" })
  permissionIds: string[];

  @ApiProperty({ description: "操作类型", enum: ["assign", "revoke"] })
  @IsString()
  @IsIn(["assign", "revoke"], { message: "操作类型必须是 assign 或 revoke" })
  action: "assign" | "revoke";
}

/**
 * 批量取消权限 DTO
 */
export class BatchRevokePermissionsDto {
  @ApiProperty({ description: "角色ID列表", type: [String] })
  @IsArray()
  @IsNotEmpty({ message: "角色ID列表不能为空" })
  roleIds: string[];

  @ApiProperty({ description: "权限ID列表", type: [String] })
  @IsArray()
  @IsNotEmpty({ message: "权限ID列表不能为空" })
  permissionIds: string[];
}

/**
 * 更新角色权限 DTO
 */
export class UpdateRolePermissionsDto {
  @ApiProperty({ description: "角色ID" })
  @IsString()
  @IsNotEmpty({ message: "角色ID不能为空" })
  roleId: string;

  @ApiProperty({ description: "权限ID列表", type: [String] })
  @IsArray()
  @IsNotEmpty({ message: "权限ID列表不能为空" })
  permissionIds: string[];
}
