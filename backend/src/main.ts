import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PrismaService } from './prisma/prisma.service';
import { ResponseMaskInterceptor } from './common/interceptors/response-mask.interceptor';
import { StandardResponseInterceptor } from './common/interceptors/standard-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Requirements 23.1: 实现API版本控制
  // 使用URI版本控制策略，确保向后兼容性
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  app.enableCors(); // 允许跨域请求
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // V6.0 高级加固：注册全局异常追踪过滤器与响应脱敏拦截器
  const prismaService = app.get(PrismaService);
  app.useGlobalFilters(new GlobalExceptionFilter(prismaService));
  app.useGlobalInterceptors(new StandardResponseInterceptor(), new ResponseMaskInterceptor());

  // Swagger 配置 - V1 API文档
  const configV1 = new DocumentBuilder()
    .setTitle('AiSystem API')
    .setDescription(`
# AiSystem 后端接口文档

## 版本说明
- **当前版本**: v1.0
- **API前缀**: /api/v1
- **版本策略**: URI版本控制，确保向后兼容性

## 系统日志管理模块

### 功能特性
- **操作日志记录**: 自动记录所有用户的增删改查等业务操作
- **登录日志记录**: 记录所有登录尝试（成功或失败）
- **ID自动转换**: 所有关联ID自动转换为真实姓名/名称展示
- **多条件查询**: 支持按多个维度组合搜索日志
- **数据导出**: 支持将日志导出为Excel格式
- **数据不可篡改**: 日志仅支持新增和查询，不可删除或编辑

### 性能要求
- 日志异步记录，主业务响应时间不超过1秒
- 查询结果3秒内返回
- 支持百万级数据查询
- 单次导出最多10万条记录

### 权限控制
- **超级管理员/审计员**: 可查询所有日志
- **普通管理员**: 仅可查询本部门/平台日志
- **普通用户**: 无日志查看权限

## 认证说明
所有接口（除前端错误上报外）均需要Bearer Token认证。
    `)
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('系统日志管理', '操作日志和登录日志的查询、导出功能')
    .build();
  const documentV1 = SwaggerModule.createDocument(app, configV1);
  SwaggerModule.setup('docs', app, documentV1, {
    customSiteTitle: 'AiSystem API文档',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`API Documentation: http://localhost:${process.env.PORT ?? 3000}/docs`);
}

void bootstrap();
