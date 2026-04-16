import {
  IsString,
  IsNotEmpty,
  Matches,
  Length,
  IsOptional,
} from "class-validator";

/**
 * 用户注册DTO
 */
export class RegisterDto {
  @IsString({ message: "姓名必须是字符串" })
  @IsNotEmpty({ message: "姓名不能为空" })
  @Length(2, 10, { message: "姓名长度必须在2-10个字符之间" })
  @Matches(/^[\u4e00-\u9fa5]+$/, { message: "姓名只能包含汉字" })
  name: string;

  @IsString({ message: "手机号必须是字符串" })
  @IsNotEmpty({ message: "手机号不能为空" })
  @Matches(/^1[3-9]\d{9}$/, { message: "请输入有效的11位手机号" })
  phone: string;

  @IsString({ message: "部门ID必须是字符串" })
  @IsNotEmpty({ message: "请选择所属部门" })
  deptId: string;

  @IsString({ message: "密码必须是字符串" })
  @IsNotEmpty({ message: "密码不能为空" })
  @Length(8, 16, { message: "密码长度必须在8-16位之间" })
  @Matches(/^(?![a-zA-Z]+$)(?!\d+$)(?![^\da-zA-Z\s]+$).{8,16}$/, {
    message: "密码需8-16位，包含字母、数字、特殊字符中的至少两种",
  })
  password: string;

  @IsString({ message: "验证码必须是字符串" })
  @IsNotEmpty({ message: "验证码不能为空" })
  @Length(4, 4, { message: "验证码必须是4位" })
  code: string;

  @IsString({ message: "验证码Key必须是字符串" })
  @IsNotEmpty({ message: "验证码Key不能为空" })
  codeKey: string;
}

/**
 * 检查手机号DTO
 */
export class CheckPhoneDto {
  @IsString({ message: "手机号必须是字符串" })
  @IsNotEmpty({ message: "手机号不能为空" })
  @Matches(/^1[3-9]\d{9}$/, { message: "请输入有效的11位手机号" })
  phone: string;
}
