# 系统优化工具包

本工具包提供了一套完整的系统优化工具和框架，帮助提升代码质量、建立测试体系、验证权限配置和增强性能监控。

## 📦 包含内容

### 1. 权限配置验证工具

- **文件**: `scripts/verify-permissions.ts`
- **功能**: 自动检测缺失权限配置的 API 端点
- **命令**: `npm run verify:permissions`
- **输出**: `PERMISSION_VERIFICATION_REPORT.md`

### 2. 测试框架

- **配置**: `backend/jest.config.js`
- **工具**: `backend/test/helpers/test-utils.ts`
- **示例**: `backend/src/modules/personnel/services/personnel-departments.service.spec.ts`
- **命令**: `npm test`, `npm run test:cov`

### 3. 性能监控系统

- **拦截器**: `backend/src/common/interceptors/performance-monitor.interceptor.ts`
- **API**: `backend/src/common/controllers/performance.controller.ts`
- **端点**: `/performance/statistics`, `/performance/endpoints`, `/performance/system`

### 4. 大文件分析工具

- **文件**: `scripts/analyze-large-files.ts`
- **功能**: 分析超过 500 行的文件并提供拆分建议
- **命令**: `npm run analyze:large-files`
- **输出**: `LARGE_FILES_ANALYSIS_REPORT.md`

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install --save-dev jest @nestjs/testing ts-jest @types/jest glob
```

### 2. 运行优化工具

```bash
# 验证权限配置
npm run verify:permissions

# 分析大文件
npm run analyze:large-files

# 运行测试
npm test

# 生成覆盖率报告
npm run test:cov
```

### 3. 集成性能监控

参考 `OPTIMIZATION_QUICKSTART.md` 中的步骤 5

## 📊 优化目标

| 指标           | 当前 | 目标 | 状态      |
| -------------- | ---- | ---- | --------- |
| 测试覆盖率     | 0%   | ≥80% | 🔴 待提升 |
| 权限配置覆盖率 | ?    | 100% | 🟡 待验证 |
| 大文件数量     | 11   | 0    | 🔴 待优化 |
| 最大文件行数   | 1182 | <300 | 🔴 待拆分 |
| 慢请求率       | ?    | <5%  | 🟡 待监控 |

## 📚 文档

- **快速开始**: `OPTIMIZATION_QUICKSTART.md`
- **详细总结**: `OPTIMIZATION_SUMMARY.md`
- **权限报告**: `PERMISSION_VERIFICATION_REPORT.md` (运行工具后生成)
- **大文件报告**: `LARGE_FILES_ANALYSIS_REPORT.md` (运行工具后生成)

## 🎯 优化路线图

### 第 1 周

- [x] 创建权限验证工具
- [x] 创建大文件分析工具
- [x] 建立测试框架
- [x] 创建性能监控系统
- [ ] 运行所有工具生成报告
- [ ] 修复高优先级问题

### 第 2-3 周

- [ ] 为核心模块编写单元测试
- [ ] 修复所有缺失的权限配置
- [ ] 拆分 >1000 行的大文件
- [ ] 集成性能监控到应用

### 第 4 周

- [ ] 测试覆盖率达到 80%
- [ ] 所有文件 <300 行
- [ ] 权限配置 100% 覆盖
- [ ] 性能监控正常运行

## 🛠️ 工具使用

### 权限验证工具

```bash
# 运行验证
npm run verify:permissions

# 查看报告
cat PERMISSION_VERIFICATION_REPORT.md

# 修复缺失权限后再次验证
npm run verify:permissions
```

### 大文件分析工具

```bash
# 运行分析
npm run analyze:large-files

# 查看报告
cat LARGE_FILES_ANALYSIS_REPORT.md

# 根据建议拆分文件
# 拆分后再次运行验证
npm run analyze:large-files
```

### 测试框架

```bash
# 运行所有测试
npm test

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:cov

# 查看覆盖率
open coverage/lcov-report/index.html

# 运行特定测试
npm test -- personnel-departments.service.spec.ts

# 调试测试
npm run test:debug
```

### 性能监控

```bash
# 启动应用
npm run start:dev

# 查看整体性能统计
curl http://localhost:3000/performance/statistics

# 查看各端点性能
curl http://localhost:3000/performance/endpoints

# 查看系统资源使用
curl http://localhost:3000/performance/system

# 带时间范围查询
curl "http://localhost:3000/performance/statistics?startTime=2026-04-16T00:00:00Z&endTime=2026-04-16T23:59:59Z"
```

## 📈 监控指标

### 性能指标

- **P50**: 50% 的请求响应时间
- **P95**: 95% 的请求响应时间
- **P99**: 99% 的请求响应时间
- **慢请求**: 响应时间 >3000ms 的请求
- **慢查询**: 执行时间 >1000ms 的数据库查询

### 代码质量指标

- **行数**: 文件总行数
- **函数数**: 文件中的函数数量
- **类数**: 文件中的类数量
- **复杂度**: low/medium/high/very_high

### 测试指标

- **行覆盖率**: 被测试覆盖的代码行百分比
- **分支覆盖率**: 被测试覆盖的分支百分比
- **函数覆盖率**: 被测试覆盖的函数百分比
- **语句覆盖率**: 被测试覆盖的语句百分比

## 🔍 故障排查

### 测试失败

```bash
# 清除缓存
npm run test -- --clearCache

# 详细输出
npm run test -- --verbose

# 只运行失败的测试
npm run test -- --onlyFailures
```

### 性能监控无数据

1. 确保已集成 `PerformanceMonitorInterceptor`
2. 确保已注册 `PerformanceController`
3. 重启应用
4. 发送一些请求
5. 再次查询性能 API

### 工具脚本报错

```bash
# 确保安装了所有依赖
npm install

# 确保 TypeScript 编译正常
npm run build

# 使用 ts-node 直接运行
npx ts-node scripts/verify-permissions.ts
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发规范

1. 所有代码必须有测试
2. 测试覆盖率不能降低
3. 遵循 ESLint 规则
4. 提交前运行所有检查

### 提交前检查清单

- [ ] 代码通过 ESLint 检查
- [ ] 所有测试通过
- [ ] 测试覆盖率 ≥80%
- [ ] 权限配置完整
- [ ] 文件行数 <300

## 📞 支持

如有问题，请：

1. 查看相关文档
2. 运行诊断工具
3. 查看生成的报告
4. 联系开发团队

---

**版本**: 1.0.0
**最后更新**: 2026-04-16
**维护者**: 开发团队
