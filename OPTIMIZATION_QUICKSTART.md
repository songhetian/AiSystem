# 系统优化快速开始指南

## 🚀 5 分钟快速开始

### 步骤 1: 安装测试依赖

```bash
cd backend
npm install --save-dev jest @nestjs/testing ts-jest @types/jest glob
```

### 步骤 2: 运行权限验证

```bash
npm run verify:permissions
```

查看生成的报告：`PERMISSION_VERIFICATION_REPORT.md`

### 步骤 3: 运行大文件分析

```bash
npm run analyze:large-files
```

查看生成的报告：`LARGE_FILES_ANALYSIS_REPORT.md`

### 步骤 4: 运行测试

```bash
npm test
```

### 步骤 5: 集成性能监控

编辑 `backend/src/app.module.ts`：

```typescript
import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PerformanceMonitorInterceptor } from "./common/interceptors/performance-monitor.interceptor";

@Module({
  imports: [
    // ... 其他导入
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceMonitorInterceptor,
    },
  ],
})
export class AppModule {}
```

编辑 `backend/src/common/common.module.ts`：

```typescript
import { Module } from "@nestjs/common";
import { PerformanceController } from "./controllers/performance.controller";
import { PerformanceMonitorInterceptor } from "./interceptors/performance-monitor.interceptor";

@Module({
  controllers: [PerformanceController],
  providers: [PerformanceMonitorInterceptor],
  exports: [PerformanceMonitorInterceptor],
})
export class CommonModule {}
```

---

## 📋 优化检查清单

### 权限配置 ✓

- [ ] 运行权限验证工具
- [ ] 查看报告，识别缺失权限的端点
- [ ] 为缺失权限的端点添加 `@Permission` 装饰器
- [ ] 再次运行验证，确保 100% 覆盖

### 测试覆盖率 ✓

- [ ] 安装测试依赖
- [ ] 运行示例测试
- [ ] 为核心服务编写单元测试
- [ ] 运行覆盖率报告
- [ ] 确保覆盖率 ≥ 80%

### 大文件拆分 ✓

- [ ] 运行大文件分析工具
- [ ] 查看拆分建议
- [ ] 优先拆分 >1000 行的文件
- [ ] 确保拆分后功能不变
- [ ] 运行测试验证

### 性能监控 ✓

- [ ] 集成性能监控拦截器
- [ ] 注册性能监控 Controller
- [ ] 启动应用测试监控 API
- [ ] 配置慢请求告警
- [ ] 定期查看性能报告

---

## 🔧 常见问题

### Q: 测试依赖安装失败？

A: 确保 Node.js 版本 ≥ 18.0.0，然后重试：

```bash
node --version
npm cache clean --force
npm install
```

### Q: 权限验证工具报错？

A: 确保安装了 `glob` 包：

```bash
npm install --save-dev glob
```

### Q: 性能监控 API 404？

A: 确保已在 `common.module.ts` 中注册 `PerformanceController`

### Q: 测试运行失败？

A: 检查 `jest.config.js` 配置，确保路径正确

---

## 📞 获取帮助

如有问题，请查看：

- `OPTIMIZATION_SUMMARY.md` - 详细优化总结
- `PERMISSION_VERIFICATION_REPORT.md` - 权限验证报告
- `LARGE_FILES_ANALYSIS_REPORT.md` - 大文件分析报告

---

**祝优化顺利！** 🎉
