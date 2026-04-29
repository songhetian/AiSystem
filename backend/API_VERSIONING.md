# API 版本控制说明

## 概述

本系统采用 **URI 版本控制策略**，确保 API 的向后兼容性和平滑升级。

## 版本控制策略

### URI 版本控制

- **格式**: `/api/v{version}/{resource}`
- **当前版本**: v1
- **默认版本**: v1

### 示例

```
# V1 API
GET /api/v1/system/logs/login
GET /api/v1/system/logs/operation
GET /api/v1/system/logs/login/export
GET /api/v1/system/logs/operation/export
POST /api/v1/system/logs/frontend-error-report
```

## 版本兼容性原则

### 向后兼容性保证

1. **不破坏现有功能**: 新版本不会移除或修改现有 API 的行为
2. **参数兼容**: 新增参数必须是可选的，不影响现有调用
3. **响应格式**: 响应结构保持一致，新增字段不影响现有解析逻辑
4. **错误码**: 错误码保持稳定，不随意修改

### 何时需要新版本

以下情况需要发布新的 API 版本：

1. **破坏性变更**
   - 移除或重命名现有字段
   - 修改字段类型或格式
   - 改变业务逻辑导致不同的响应

2. **重大功能调整**
   - 接口路径变更
   - 认证方式变更
   - 请求/响应格式重构

3. **不兼容的优化**
   - 性能优化导致行为变化
   - 安全加固影响现有调用

### 何时不需要新版本

以下情况可以在现有版本中更新：

1. **向后兼容的新增**
   - 新增可选参数
   - 新增响应字段
   - 新增接口端点

2. **Bug 修复**
   - 修复错误行为
   - 修复安全漏洞
   - 修复性能问题

3. **文档更新**
   - 完善 API 文档
   - 添加使用示例
   - 更新错误码说明

## 版本生命周期

### V1 (当前版本)

- **发布时间**: 2024-01
- **状态**: 稳定版本
- **支持期限**: 长期支持
- **功能**:
  - 系统日志查询（操作日志、登录日志）
  - 日志数据导出（Excel 格式）
  - 多条件组合搜索
  - 分页查看
  - 权限控制

### 未来版本规划

#### V2 (计划中)

可能包含的功能：
- 日志实时推送（WebSocket）
- 高级分析和统计
- 自定义导出格式
- 日志归档管理

## 版本迁移指南

### 从 V1 迁移到 V2（未来）

当 V2 发布时，我们将提供：

1. **迁移文档**: 详细的变更说明和迁移步骤
2. **兼容期**: V1 和 V2 将并行运行至少 6 个月
3. **废弃通知**: 提前 3 个月通知 V1 废弃计划
4. **迁移工具**: 提供自动化迁移脚本和工具

### 版本选择建议

- **新项目**: 使用最新稳定版本（当前为 V1）
- **现有项目**: 保持当前版本，除非需要新功能
- **生产环境**: 充分测试后再升级版本

## API 文档

### Swagger 文档

- **访问地址**: `http://localhost:3000/docs`
- **内容**: 完整的 API 接口文档，包括请求参数、响应格式、错误码等

### 文档特性

- 交互式 API 测试
- 请求/响应示例
- 参数验证规则
- 错误码说明
- 认证方式说明

## 技术实现

### NestJS 版本控制配置

```typescript
// main.ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
  prefix: 'api/v',
});
```

### 控制器版本声明

```typescript
@Controller('system/logs')
@Version('1')
export class SystemLogsController {
  // ...
}
```

## 最佳实践

### 客户端调用

1. **明确指定版本**: 始终在 URL 中包含版本号
   ```
   ✅ GET /api/v1/system/logs/login
   ❌ GET /api/system/logs/login
   ```

2. **版本号配置化**: 将 API 版本号配置在环境变量或配置文件中
   ```typescript
   const API_VERSION = process.env.API_VERSION || 'v1';
   const baseURL = `${API_BASE_URL}/api/${API_VERSION}`;
   ```

3. **错误处理**: 处理版本不支持的错误
   ```typescript
   if (error.status === 404 && error.message.includes('version')) {
     // 版本不存在，提示用户升级客户端
   }
   ```

### 服务端开发

1. **版本隔离**: 不同版本的控制器和服务分开管理
   ```
   controllers/
     v1/
       system-logs.controller.ts
     v2/
       system-logs.controller.ts
   ```

2. **共享逻辑**: 将可复用的业务逻辑提取到服务层
   ```typescript
   // 服务层不关心版本，由控制器适配
   class SystemLogsService {
     async listLogs() { /* ... */ }
   }
   ```

3. **版本测试**: 为每个版本编写独立的测试用例
   ```typescript
   describe('SystemLogsController V1', () => {
     // V1 测试
   });

   describe('SystemLogsController V2', () => {
     // V2 测试
   });
   ```

## 联系方式

如有版本相关问题，请联系：
- 技术支持: support@example.com
- 文档反馈: docs@example.com
