import { IsNotEmpty, IsOptional, IsString, IsInt } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 设置角色继承DTO
 */
export class SetRoleInheritanceDto {
  @ApiProperty({ description: "角色ID" })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ description: "父角色ID", required: false })
  @IsString()
  @IsOptional()
  parentRoleId?: string;
}

/**
 * 同步继承权限DTO
 */
export class SyncInheritedPermissionsDto {
  @ApiProperty({ description: "父角色ID" })
  @IsString()
  @IsNotEmpty()
  parentRoleId: string;

  @ApiProperty({ description: "是否同步到所有子角色", required: false })
  @IsInt()
  @IsOptional()
  syncToAll?: number;
}

/**
 * 角色层级DTO
 */
export class RoleHierarchyDto {
  @ApiProperty({ description: "角色ID" })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ description: "层级", required: false })
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiProperty({ description: "排序", required: false })
  @IsInt()
  @IsOptional()
  sort?: number;
}
