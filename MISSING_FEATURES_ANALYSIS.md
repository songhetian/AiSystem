# 缺失功能分析报告

## 概述
本文档分析系统中尚未完全实现或需要完善的功能模块。

## 🔴 高优先级 - 需要立即实现

### 1. 商城活动管理 (Shop Activities)

**状态**: 前端页面存在，但API未实现

**缺失内容**:
- ❌ 后端控制器 (`backend/src/modules/shop/controllers/activity.controller.ts`)
- ❌ 后端服务 (`backend/src/modules/shop/services/activity.service.ts`)
- ❌ DTO定义 (`backend/src/modules/shop/dto/`)
- ✅ 前端页面已存在 (`frontend/src/pages/shop/activities/`)

**需要实现的功能**:
- 活动列表查询
- 活动创建/编辑/删除
- 活动状态管理
- 活动规则配置
- 活动统计分析

**数据库表**: `shop_activity` (需要确认是否存在)

---

### 2. 客服组管理 (Agent Groups)

**状态**: 前端页面存在，但API未完全实现

**缺失内容**:
- ⚠️ 部分API未实现（删除、排序等）
- ✅ 前端页面已存在 (`frontend/src/pages/service/agent-groups/`)

**需要完善的功能**:
```typescript
// TODO: 调用删除API
// TODO: 调用API保存排序
// TODO: 调用API保存成员排序
```

---

### 3. 系统日志 - 平台/部门/店铺选项加载

**状态**: 功能基本完成，但缺少下拉选项数据加载

**缺失内容**:
```typescript
// frontend/src/pages/system/logs/operation/index.tsx
options: [], // TODO: 从后端获取平台列表
options: [], // TODO: 从后端获取部门列表
options: [], // TODO: 从后端获取店铺列表
```

**解决方案**: 需要调用现有的平台、部门、店铺API来填充下拉选项

---

## 🟡 中优先级 - 需要完善

### 4. 审批系统 - 高级功能

**缺失功能**:

#### 4.1 版本切换
```typescript
// backend/src/modules/approval/services/approval-process.service.ts
// TODO: 实现版本切换逻辑
throw new BadRequestException('版本切换功能暂未实现');
```

#### 4.2 超时统计
```typescript
// backend/src/modules/approval/services/statistics.service.ts
timeoutRate: 0, // TODO: 实现超时统计
```

#### 4.3 权限检查优化
```typescript
// backend/src/modules/approval/services/approval-instance.service.ts
// TODO: 检查管理员权限

// backend/src/modules/approval/services/approval-template.service.ts
// TODO: 根据用户权限添加平台和部门过滤
```

#### 4.4 流程图验证
```typescript
// backend/src/modules/approval/services/approval-template.service.ts
// TODO: 检查节点连接是否形成有效的流程图（无死循环、无孤立节点）
```

---

### 5. 人事管理 - 工牌照片

**状态**: 数据库字段缺失

**问题**:
```typescript
// backend/src/modules/personnel/services/personnel-employees.service.ts
// TODO: Add badge_photo_file field to hr_employee table in Prisma schema
// 目前使用 id_card_front_file 作为临时替代
```

**解决方案**:
1. 在Prisma schema中添加 `badge_photo_file` 字段
2. 创建数据库迁移
3. 更新相关服务代码

---

### 6. 注册审核 - 短信通知

**状态**: 功能标记为TODO

**缺失内容**:
```typescript
// backend/src/modules/auth/services/register.service.ts
// TODO: 发送审核通过短信通知
// TODO: 发送审核拒绝短信通知
```

**解决方案**: 集成短信服务（阿里云、腾讯云等）

---

### 7. 文件服务 - 权限检查

**状态**: 权限检查被注释

**缺失内容**:
```typescript
// backend/src/common/services/enhanced-file.service.ts
// TODO: 权限检查
// if (userId && !file.is_public) {
//   await this.checkFileAccess(file, userId);
// }
```

---

## 🟢 低优先级 - 可选优化

### 8. 数据集成工具

**状态**: 框架存在，具体实现待完成

**缺失内容**:
```typescript
// backend/src/modules/system/workers/cron.worker.ts
// TODO: 需要实现 fetchData 方法
// const rawData = await this.integrationAdapter.fetchData(job.job_type, config);
```

---

### 9. 清理工具脚本

**状态**: 脚本框架存在，功能未实现

**缺失内容**:
```typescript
// backend/scripts/cleanup/index.ts
// TODO: Implement cleanup logic
// TODO: Implement restore logic
// TODO: Implement list backups logic
```

---

### 10. 日志监控 - 缓存性能

**状态**: 功能标记为待实现

**缺失内容**:
```typescript
// backend/src/modules/system/services/log-monitoring.service.ts
this.logger.debug('[LogMonitoring] 缓存性能检查（待实现）');
```

---

## 📊 功能完成度统计

| 模块 | 完成度 | 状态 | 优先级 |
|------|--------|------|--------|
| 审批系统 | 95% | ✅ 核心功能完成 | 中 |
| 财务管理 | 100% | ✅ 完全实现 | - |
| 系统日志 | 98% | ✅ 基本完成 | 低 |
| 人事管理 | 98% | ✅ 基本完成 | 中 |
| 考勤管理 | 100% | ✅ 完全实现 | - |
| 知识库 | 100% | ✅ 完全实现 | - |
| 考试管理 | 100% | ✅ 完全实现 | - |
| 客服质检 | 100% | ✅ 完全实现 | - |
| 商城管理 | 50% | ⚠️ 活动管理缺失 | 高 |
| 客服组管理 | 85% | ⚠️ 部分API缺失 | 高 |

---

## 🎯 推荐实施顺序

### 第一阶段：核心功能补全（1-2天）

1. **商城活动管理** - 完整实现后端API
   - 创建控制器和服务
   - 实现CRUD操作
   - 连接前端页面

2. **客服组管理** - 补全缺失API
   - 实现删除功能
   - 实现排序功能
   - 测试前后端集成

3. **系统日志选项加载** - 补全下拉选项
   - 调用现有API获取平台列表
   - 调用现有API获取部门列表
   - 调用现有API获取店铺列表

### 第二阶段：功能完善（2-3天）

4. **审批系统高级功能**
   - 实现版本切换
   - 实现超时统计
   - 完善权限检查
   - 优化流程图验证

5. **人事管理工牌照片**
   - 添加数据库字段
   - 更新服务代码
   - 测试上传和显示

### 第三阶段：可选优化（按需实施）

6. **短信通知集成**
7. **文件权限检查**
8. **数据集成工具**
9. **清理工具脚本**
10. **日志监控优化**

---

## 📝 实施建议

### 立即开始

建议从**商城活动管理**开始，因为：
1. 前端页面已完成，只需实现后端
2. 功能相对独立，不影响其他模块
3. 用户可能已经在使用前端页面，需要尽快连接API

### 实施步骤

#### 1. 商城活动管理实施计划

**Step 1: 创建DTO** (30分钟)
```bash
backend/src/modules/shop/dto/
├── create-activity.dto.ts
├── update-activity.dto.ts
├── query-activity.dto.ts
└── activity-rule.dto.ts
```

**Step 2: 创建服务** (2小时)
```bash
backend/src/modules/shop/services/activity.service.ts
```

**Step 3: 创建控制器** (1小时)
```bash
backend/src/modules/shop/controllers/activity.controller.ts
```

**Step 4: 更新模块** (15分钟)
```bash
backend/src/modules/shop/shop.module.ts
```

**Step 5: 测试和集成** (1小时)
- 测试API端点
- 连接前端页面
- 验证功能完整性

---

## 🔍 需要确认的问题

1. **数据库表是否存在**
   - `shop_activity` 表是否已创建？
   - `agent_group` 表是否已创建？
   - 需要检查 Prisma schema

2. **业务需求确认**
   - 商城活动的具体业务规则？
   - 活动类型有哪些？
   - 活动规则如何配置？

3. **优先级确认**
   - 哪些功能是用户急需的？
   - 哪些功能可以延后实施？

---

**更新时间**: 2026-04-29
**文档版本**: 1.0
