import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 查询权限控制配置 DTO
 */
export class QueryPermissionControlDto {
  @ApiProperty({
    description: "资源类型",
    enum: ["module", "menu", "button"],
    required: false,
  })
  @IsString()
  @IsIn(["module", "menu", "button"], {
    message: "资源类型必须是 module/menu/button",
  })
  @IsOptional()
  resourceType?: string;

  @ApiProperty({ description: "是否需要权限控制", required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  needControl?: number;
}

/**
 * 更新权限控制配置 DTO
 */
export class UpdatePermissionControlDto {
  @ApiProperty({ description: "资源类型", enum: ["module", "menu", "button"] })
  @IsString()
  @IsIn(["module", "menu", "button"], {
    message: "资源类型必须是 module/menu/button",
  })
  resourceType: string;

  @ApiProperty({ description: "资源ID" })
  @IsString()
  @IsNotEmpty({ message: "资源ID不能为空" })
  resourceId: string;

  @ApiProperty({ description: "资源名称" })
  @IsString()
  @IsNotEmpty({ message: "资源名称不能为空" })
  resourceName: string;

  @ApiProperty({ description: "是否需要权限控制", required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  needControl?: number;

  @ApiProperty({
    description: "例外角色ID列表",
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  exceptionRoles?: string[];
}

/**
 * 批量更新权限控制配置 DTO
 */
export class BatchUpdatePermissionControlDto {
  @ApiProperty({ description: "配置列表", type: [UpdatePermissionControlDto] })
  @IsArray()
  @IsNotEmpty({ message: "配置列表不能为空" })
  configs: UpdatePermissionControlDto[];
}

/**
 * 创建权限控制配置 DTO
 */
export class CreatePermissionControlDto {
  @ApiProperty({ description: "资源类型", enum: ["module", "menu", "button"] })
  @IsString()
  @IsIn(["module", "menu", "button"], {
    message: "资源类型必须是 module/menu/button",
  })
  resourceType: string;

  @ApiProperty({ description: "资源ID" })
  @IsString()
  @IsNotEmpty({ message: "资源ID不能为空" })
  resourceId: string;

  @ApiProperty({ description: "资源名称" })
  @IsString()
  @IsNotEmpty({ message: "资源名称不能为空" })
  resourceName: string;

  @ApiProperty({
    description: "是否需要权限控制",
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  needControl?: boolean;

  @ApiProperty({
    description: "例外角色ID列表",
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  exceptionRoles?: string[];
}
