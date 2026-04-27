# 数据库迁移：JWT与日志增强

## 迁移说明

**迁移名称**: add_jwt_and_log_enhancements
**创建时间**: 2026-04-26
**优先级**: P0（极高）

## 变更内容

### 1. 新增表

#### sys_jwt_blacklist（JWT Token黑名单表）
用于存储已失效的JWT Token，防止Token被重复使用。

**字段**:
- `id`: 主键
- `create_time`: 创建时间
- `token`: JWT Token（唯一）
- `user_id`: 用户ID
- `reason`: 失效原因（logout/force_logout/security）
- `expire_time`: 过期时间

**索引**:
- `token`（唯一索引）
- `user_id`
- `expire_time`

#### sys_login_attempt（登录尝试记录表）
用于记录登录尝试，实现账号锁定功能。

**字段**:
- `id`: 主键
- `create_time`: 创建时间
- `username`: 用户名
- `ip_address`: IP地址
- `attempt_time`: 尝试时间
- `is_success`: 是否成功（0/1）

**索引**:
- `username, attempt_time`（复合索引）

### 2. 更新表

#### sys_login_log（登录日志表）
新增字段：
- `login_method`: 登录方式（password/sms/wechat）
- `device_type`: 设备类型（pc/mobile/tablet）

#### sys_operation_log（操作日志表）
新增字段：
- `execution_time`: 执行时间（毫秒）

## 应用迁移

### 方式一：使用Prisma CLI（推荐）

```bash
# 进入backend目录
cd backend

# 应用迁移
npx prisma migrate deploy

# 或者在开发环境
npx prisma migrate dev
```

### 方式二：手动执行SQL

```bash
# 连接到MySQL数据库
mysql -u your_username -p your_database

# 执行迁移SQL
source backend/prisma/migrations/20260426_add_jwt_and_log_enhancements/migration.sql
```

### 方式三：使用数据库管理工具

1. 打开数据库管理工具（如Navicat、DBeaver、phpMyAdmin）
2. 连接到目标数据库
3. 打开 `migration.sql` 文件
4. 执行SQL语句

## 验证迁移

执行以下SQL验证迁移是否成功：

```sql
-- 检查新表是否创建
SHOW TABLES LIKE 'sys_jwt_blacklist';
SHOW TABLES LIKE 'sys_login_attempt';

-- 检查sys_login_log新字段
DESCRIBE sys_login_log;

-- 检查sys_operation_log新字段
DESCRIBE sys_operation_log;
```

## 回滚迁移

如需回滚，执行以下SQL：

```sql
-- 删除新表
DROP TABLE IF EXISTS `sys_jwt_blacklist`;
DROP TABLE IF EXISTS `sys_login_attempt`;

-- 删除新字段
ALTER TABLE `sys_login_log`
    DROP COLUMN `login_method`,
    DROP COLUMN `device_type`;

ALTER TABLE `sys_operation_log`
    DROP COLUMN `execution_time`;
```

## 注意事项

1. **备份数据库**: 在应用迁移前，请务必备份数据库
2. **测试环境**: 建议先在测试环境验证迁移
3. **停机时间**: 迁移过程中可能需要短暂停机
4. **索引创建**: 大表添加索引可能需要较长时间

## 相关文档

- [实施计划-P0-JWT与日志](../../../docs/实施计划-P0-JWT与日志.md)
- [实施进度-P0-JWT与日志](../../../docs/实施进度-P0-JWT与日志.md)
