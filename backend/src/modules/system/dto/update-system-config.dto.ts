import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * 更新系统配置 DTO
 */
export class UpdateSystemConfigDto {
  @ApiProperty({ description: "配置键" })
  @IsString()
  @IsNotEmpty({ message: "配置键不能为空" })
  configKey: string;

  @ApiProperty({ description: "配置值" })
  @IsString()
  @IsNotEmpty({ message: "配置值不能为空" })
  configValue: string;

  @ApiProperty({
    description: "配置类型",
    enum: ["string", "number", "boolean", "json"],
    required: false,
  })
  @IsString()
  @IsIn(["string", "number", "boolean", "json"], {
    message: "配置类型必须是 string/number/boolean/json",
  })
  @IsOptional()
  configType?: string;

  @ApiProperty({ description: "配置描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

/**
 * 创建系统配置 DTO
 */
export class CreateSystemConfigDto {
  @ApiProperty({ description: "配置键" })
  @IsString()
  @IsNotEmpty({ message: "配置键不能为空" })
  configKey: string;

  @ApiProperty({ description: "配置值" })
  @IsString()
  @IsNotEmpty({ message: "配置值不能为空" })
  configValue: string;

  @ApiProperty({
    description: "配置类型",
    enum: ["string", "number", "boolean", "json"],
  })
  @IsString()
  @IsIn(["string", "number", "boolean", "json"], {
    message: "配置类型必须是 string/number/boolean/json",
  })
  configType: string;

  @ApiProperty({ description: "配置描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
