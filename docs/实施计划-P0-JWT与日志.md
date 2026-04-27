# P0级功能实施计划：JWT身份认证与系统日志管理

## 文档信息

**创建时间**: 2026-04-26
**优先级**: P0（极高）
**预计工期**: 2周（10个工作日）
**负责模块**: 后端 + 前端
**依赖**: Redis服务（✅ 已实现）

---

## 一、实施目标

### 1.1 核心目标
- ✅ 建立系统安全基础，实现JWT统一身份认证
- ✅ 实现完整的系统日志管理（操作日志、登录日志）
- ✅ 满足审计合规要求

### 1.2 验收标准
- [ ] 所有业务接口支持JWT验证
- [ ] Token过期、伪造、黑名单场景正确处理
- [ ] 操作日志自动记录所有增删改查操作
- [ ] 登录日志记录所有登录尝试
- [ ] 日志查询和导出功能可用
- [ ] 连续5次登录失败触发账号锁定

---

## 二、任务分解

### 阶段一：JWT身份认证系统（5-7天）

#### Task 1.1: Prisma Schema更新
**工作量**: 0.5天

**文件**: `backend/prisma/schema.prisma`

**新增表**:
```prisma
// JWT Token黑名单表
model sys_jwt_blacklist {
  id          String   @id @default(cuid())
  create_time DateTime @default(now())
  token       String   @unique @db.VarChar(1000)
  user_id     String
  reason      String?  // logout, force_logout, security
  expire_time DateTime

  @@index([token])
  @@index([user_id])
  @@index([expire_time])
}

// 登录失败记录表（用于账号锁定）
model sys_login_attempt {
  id           String   @id @default(cuid())
  create_time  DateTime @default(now())
  username     String
  ip_address   String?
  attempt_time DateTime @default(now())
  is_success   Int      @default(0)

  @@index([username, attempt_time])
}
```

**操作**:
1. 更新schema.prisma
2. 生成迁移：`npm run prisma:migrate`
3. 应用迁移到数据库

---

#### Task 1.2: JWT服务实现
**工作量**: 1天

**文件**: `backend/src/common/services/jwt-auth.service.ts`

**功能**:
- Token生成（包含用户ID、姓名、平台ID、角色权限、过期时间）
- Token验证（存在性、有效性、签名完整性、黑名单检查）
- Token刷新（提前5分钟自动刷新）
- Token加入黑名单（登出、强制登出、安全原因）
- 登录失败统计（Redis计数器）
- 账号锁定检查（连续5次失败锁定15分钟）

**依赖**: RedisService（✅ 已实现）

---

#### Task 1.3: JWT Guard实现
**工作量**: 1天

**文件**: `backend/src/common/guards/jwt-auth.guard.ts`

**功能**:
- 拦截所有业务接口（登录接口除外）
- 提取Token（Header、Query、Body）
- 验证Token有效性
- 检查Token黑名单
- 异常处理（401错误、记录安全日志）
- 支持@Public装饰器跳过验证

**更新文件**: `backend/src/app.module.ts`（全局注册Guard）

---

#### Task 1.4: 登录接口改造
**工作量**: 1天

**文件**: `backend/src/modules/auth/auth.controller.ts`

**功能**:
- 登录前检查账号锁定状态
- 登录成功生成JWT Token
- 登录失败记录失败次数（Redis）
- 连续5次失败触发账号锁定
- 返回Token和用户信息

**更新文件**: `backend/src/modules/auth/auth.service.ts`

---

#### Task 1.5: 登出接口实现
**工作量**: 0.5天

**文件**: `backend/src/modules/auth/auth.controller.ts`

**功能**:
- 将当前Token加入黑名单
- 清除用户相关缓存
- 记录登出日志

---

#### Task 1.6: Token刷新接口
**工作量**: 0.5天

**文件**: `backend/src/modules/auth/auth.controller.ts`

**功能**:
- 验证旧Token有效性
- 生成新Token
- 将旧Token加入黑名单
- 返回新Token

---

#### Task 1.7: 前端Token管理
**工作量**: 1天

**文件**:
- `frontend/src/utils/request.ts`（请求拦截器）
- `frontend/src/utils/auth.ts`（Token工具类）

**功能**:
- 请求拦截器自动添加Token
- 响应拦截器处理401错误
- Token自动刷新（提前5分钟）
- Token存储（localStorage）
- 登出清除Token

---

### 阶段二：系统日志管理（8-10天）

#### Task 2.1: Prisma Schema更新
**工作量**: 0.5天

**文件**: `backend/prisma/schema.prisma`

**更新表**: `sys_operation_log`（已存在，需补充字段）
```prisma
model sys_operation_log {
  id                String   @id @default(cuid())
  create_time       DateTime @default(now())
  update_time       DateTime @updatedAt
  is_deleted        Int      @default(0)
  user_id           String?
  username          String?
  request_method    String
  api_path          String
  api_name          String?
  operation_module  String?
  request_ip        String?
  user_agent        String?  @db.VarChar(512)
  operation_status  Int      @default(1)
  operation_message String?
  request_params    Json?
  response_summary  Json?
  diff_content      Json?    // 字段级变更详情
  platform_id       String?
  dept_id           String?
  shop_id           String?
  execution_time    Int?     // 新增：执行时间（毫秒）

  @@index([platform_id, dept_id])
  @@index([user_id, create_time])
  @@index([operation_module, create_time])
  @@index([operation_status, create_time])
  @@index([create_time])
  @@index([username, create_time])
}
```

**更新表**: `sys_login_log`（已存在，需补充字段）
```prisma
model sys_login_log {
  id              String   @id @default(cuid())
  create_time     DateTime @default(now())
  update_time     DateTime @updatedAt
  is_deleted      Int      @default(0)
  user_id         String?
  username        String
  login_ip        String?
  user_agent      String?  @db.VarChar(512)
  login_status    Int      @default(1)
  login_message   String?
  platform_id     String?
  dept_id         String?
  shop_id         String?
  login_method    String?  // 新增：登录方式（password/sms/wechat）
  device_type     String?  // 新增：设备类型（pc/mobile/tablet）

  @@index([username, create_time])
  @@index([login_status, create_time])
  @@index([platform_id])
  @@index([user_id])
}
```

---

#### Task 2.2: 操作日志拦截器
**工作量**: 2天

**文件**: `backend/src/common/interceptors/operation-log.interceptor.ts`（已存在，需增强）

**功能**:
- 自动拦截所有增删改查操作
- 记录操作时间、操作人、操作模块、操作内容
- 记录请求参数、响应摘要
- 字段级变更详情（对比修改前后数据）
- ID自动转换为真实姓名/名称
- 异步记录，不影响主业务
- 支持Redis故障兜底（List缓存）

**依赖**: RedisService（✅ 已实现）

---

#### Task 2.3: 登录日志服务
**工作量**: 1天

**文件**: `backend/src/common/services/login-log.service.ts`

**功能**:
- 记录所有登录尝试（成功/失败）
- 记录登录IP、设备、浏览器
- 异步记录，不影响登录流程
- 支持Redis故障兜底

---

#### Task 2.4: 日志查询接口
**工作量**: 2天

**文件**: `backend/src/modules/system/controllers/system-logs.controller.ts`

**接口**:
1. `GET /system/logs/operation` - 操作日志列表
   - 多条件筛选（用户、模块、时间、状态）
   - 分页查询
   - 权限控制（管理员查看全部，普通用户仅查看个人）

2. `GET /system/logs/login` - 登录日志列表
   - 多条件筛选（用户、IP、时间、状态）
   - 分页查询
   - 权限控制

3. `GET /system/logs/operation/export` - 导出操作日志
   - Excel格式
   - 支持筛选条件

4. `GET /system/logs/login/export` - 导出登录日志
   - Excel格式
   - 支持筛选条件

---

#### Task 2.5: 前端日志管理页面
**工作量**: 3天

**文件结构**:
```
frontend/src/pages/system/logs/
├── operation/
│   ├── index.tsx          # 操作日志列表页
│   └── components/
│       ├── LogFilter.tsx  # 筛选组件（可复用）
│       └── LogTable.tsx   # 日志表格组件（可复用）
├── login/
│   ├── index.tsx          # 登录日志列表页
│   └── components/
│       ├── LogFilter.tsx  # 筛选组件（可复用）
│       └── LogTable.tsx   # 日志表格组件（可复用）
└── components/
    ├── LogDetailDrawer.tsx  # 日志详情抽屉（可复用）
    └── ExportButton.tsx     # 导出按钮（可复用）
```

**功能**:
- 操作日志列表（表格展示）
- 登录日志列表（表格展示）
- 多条件筛选（时间范围、用户、模块、状态）
- 分页查看（10/20/50/100条/页）
- 日志详情查看（抽屉展示）
- 导出Excel功能
- 权限控制（按钮级别）

**UI风格**: 参考现有系统管理页面（Ant Design Pro风格）

---

#### Task 2.6: 权限配置
**工作量**: 0.5天

**文件**:
- `backend/prisma/seed.ts`（权限数据）
- `frontend/src/constants/permission.ts`（权限常量）

**新增权限**:
```typescript
// 菜单权限
{
  menu_name: '系统日志',
  menu_code: 'system:logs',
  parent_id: 'system', // 系统管理子菜单
  route: '/system/logs',
  icon: 'FileTextOutlined',
  sort: 50,
  type: 1, // 菜单
  children: [
    {
      menu_name: '操作日志',
      menu_code: 'system:logs:operation',
      route: '/system/logs/operation',
      sort: 1,
      type: 1,
    },
    {
      menu_name: '登录日志',
      menu_code: 'system:logs:login',
      route: '/system/logs/login',
      sort: 2,
      type: 1,
    }
  ]
}

// 按钮权限
{
  button_name: '查看日志',
  button_code: 'system:logs:view',
  menu_id: 'system:logs:operation',
},
{
  button_name: '导出日志',
  button_code: 'system:logs:export',
  menu_id: 'system:logs:operation',
},
{
  button_name: '查看详情',
  button_code: 'system:logs:detail',
  menu_id: 'system:logs:operation',
}
```

---

#### Task 2.7: 路由配置
**工作量**: 0.5天

**文件**: `frontend/src/.umi/routes.ts`

**新增路由**:
```typescript
{
  path: '/system/logs',
  name: '系统日志',
  icon: 'FileTextOutlined',
  routes: [
    {
      path: '/system/logs/operation',
      name: '操作日志',
      component: '@/pages/system/logs/operation',
    },
    {
      path: '/system/logs/login',
      name: '登录日志',
      component: '@/pages/system/logs/login',
    },
  ],
}
```

---

## 三、可复用组件设计

### 3.1 LogFilter组件（日志筛选）
**文件**: `frontend/src/pages/system/logs/components/LogFilter.tsx`

**Props**:
```typescript
interface LogFilterProps {
  onFilter: (values: any) => void;
  filterType: 'operation' | 'login';
  loading?: boolean;
}
```

**功能**:
- 时间范围选择（DateRangePicker）
- 用户选择（Select，支持搜索）
- 模块选择（Select，仅操作日志）
- 状态选择（Select）
- 重置按钮
- 查询按钮

---

### 3.2 LogTable组件（日志表格）
**文件**: `frontend/src/pages/system/logs/components/LogTable.tsx`

**Props**:
```typescript
interface LogTableProps {
  dataSource: any[];
  loading?: boolean;
  pagination: PaginationConfig;
  onPageChange: (page: number, pageSize: number) => void;
  onViewDetail: (record: any) => void;
  tableType: 'operation' | 'login';
}
```

**功能**:
- 表格展示（Ant Design Table）
- 分页控制
- 查看详情按钮
- 状态标签（成功/失败）
- 时间格式化

---

### 3.3 LogDetailDrawer组件（日志详情）
**文件**: `frontend/src/pages/system/logs/components/LogDetailDrawer.tsx`

**Props**:
```typescript
interface LogDetailDrawerProps {
  visible: boolean;
  onClose: () => void;
  record: any;
  detailType: 'operation' | 'login';
}
```

**功能**:
- 抽屉展示（Ant Design Drawer）
- 详情信息展示（Descriptions）
- 字段变更对比（仅操作日志）
- JSON格式化展示

---

### 3.4 ExportButton组件（导出按钮）
**文件**: `frontend/src/pages/system/logs/components/ExportButton.tsx`

**Props**:
```typescript
interface ExportButtonProps {
  exportType: 'operation' | 'login';
  filters: any;
  disabled?: boolean;
}
```

**功能**:
- 导出按钮（Ant Design Button）
- 导出进度提示
- 文件下载

---

## 四、实施顺序

### Day 1-2: JWT基础实现
- Task 1.1: Prisma Schema更新
- Task 1.2: JWT服务实现
- Task 1.3: JWT Guard实现

### Day 3-4: JWT接口实现
- Task 1.4: 登录接口改造
- Task 1.5: 登出接口实现
- Task 1.6: Token刷新接口
- Task 1.7: 前端Token管理

### Day 5: JWT测试与优化
- 接口测试
- 异常场景测试
- 性能优化

### Day 6-7: 日志基础实现
- Task 2.1: Prisma Schema更新
- Task 2.2: 操作日志拦截器
- Task 2.3: 登录日志服务

### Day 8-9: 日志接口与前端
- Task 2.4: 日志查询接口
- Task 2.5: 前端日志管理页面（第1-2天）

### Day 10: 权限配置与测试
- Task 2.5: 前端日志管理页面（第3天）
- Task 2.6: 权限配置
- Task 2.7: 路由配置
- 整体测试
- 文档更新

---

## 五、测试计划

### 5.1 JWT功能测试
- [ ] 登录成功生成Token
- [ ] Token验证通过
- [ ] Token过期返回401
- [ ] Token伪造返回401
- [ ] Token黑名单拒绝访问
- [ ] Token自动刷新
- [ ] 登录失败5次账号锁定
- [ ] 15分钟后账号解锁

### 5.2 日志功能测试
- [ ] 操作日志自动记录
- [ ] 登录日志自动记录
- [ ] 日志查询正确
- [ ] 日志筛选正确
- [ ] 日志分页正确
- [ ] 日志导出正确
- [ ] 权限控制正确

---

## 六、风险与应对

### 6.1 技术风险
| 风险 | 影响 | 应对措施 |
|------|------|----------|
| JWT密钥泄露 | 高 | 定期更换密钥，密钥存储在环境变量 |
| 日志数据量大 | 中 | 分表存储，定期归档 |
| Redis故障 | 中 | 实现故障兜底机制（List缓存） |

### 6.2 进度风险
| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 需求变更 | 中 | 需求冻结，变更评审 |
| 测试时间不足 | 中 | 提前编写测试用例 |

---

## 七、交付物

- [ ] JWT身份认证服务（完整代码）
- [ ] JWT Guard（完整代码）
- [ ] 登录/登出/刷新接口（完整代码）
- [ ] 操作日志拦截器（完整代码）
- [ ] 登录日志服务（完整代码）
- [ ] 日志查询接口（完整代码）
- [ ] 前端日志管理页面（完整代码）
- [ ] 可复用组件（LogFilter、LogTable、LogDetailDrawer、ExportButton）
- [ ] Prisma迁移文件
- [ ] 权限配置数据
- [ ] 测试报告
- [ ] 技术文档

---

**文档维护**: 本文档将根据实施进展实时更新
