# 系统日志管理系统 - 生产环境部署指南

## 概述

本指南提供系统日志管理系统的生产环境部署步骤和配置说明。

**Requirements**: 19.1, 21.1, 22.3

## 部署前准备

### 1. 系统要求

- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 7+) 或 Windows Server 2019+
- **Node.js**: v18.0.0 或更高版本
- **数据库**: MySQL 8.0+ 或 PostgreSQL 13+
- **Redis**: 6.0+
- **内存**: 至少 4GB RAM（推荐 8GB+）
- **存储**: 至少 50GB 可用空间

### 2. 依赖服务

- MySQL/PostgreSQL 数据库服务器
- Redis 缓存服务器
- SMTP 邮件服务器（用于告警通知）
- 网络连接（用于发送邮件和访问外部服务）

## 部署步骤

### 步骤 1: 克隆代码仓库

```bash
git clone <repository-url>
cd <project-directory>
```

### 步骤 2: 安装依赖

```bash
cd backend
npm install
```

### 步骤 3: 配置环境变量

1. 复制环境变量模板文件：

```bash
cp ../.env.example ../.env.production
```

2. 编辑 `.env.production` 文件，配置以下关键参数：

#### 数据库配置

```bash
# 数据库连接
DATABASE_URL=mysql://user:password@host:3306/database?connection_limit=100&pool_timeout=30&connect_timeout=10

# 连接池配置
DB_CONNECTION_LIMIT=100
DB_POOL_TIMEOUT=30
DB_CONNECT_TIMEOUT=10
DB_IDLE_TIMEOUT=600
DB_MIN_CONNECTIONS=10
```

#### Redis 配置

```bash
# Redis 连接
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Redis 高级配置
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_MAX_RETRIES=3
```

#### 邮件服务配置

```bash
# SMTP 配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@example.com
SMTP_FROM_NAME=雷犀AI客服系统
SMTP_USE_TLS=true
SMTP_ENABLED=true
```

#### 备份配置

```bash
# 自动备份
AUTO_BACKUP_ENABLED=true
BACKUP_CRON=0 0 2 * * *
BACKUP_RETENTION_DAYS=365
BACKUP_PATH=storage/backups/
```

#### 监控和告警配置

```bash
# 性能监控
PERFORMANCE_MONITORING_ENABLED=true
SLOW_QUERY_THRESHOLD=200
SLOW_API_THRESHOLD=1000

# 异常告警
ALERT_ENABLED=true
ALERT_EMAIL_ENABLED=true
ALERT_MESSAGE_ENABLED=true
ALERT_RECIPIENTS=admin@example.com,ops@example.com

# 备份任务监控
BACKUP_MONITORING_ENABLED=true
BACKUP_TIMEOUT_HOURS=2
ARCHIVE_AGE_THRESHOLD_HOURS=48
```

### 步骤 4: 数据库迁移

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate
```

### 步骤 5: 构建应用

```bash
npm run build
```

### 步骤 6: 启动应用

#### 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/src/main.js --name "log-system" --env production

# 设置开机自启
pm2 startup
pm2 save
```

#### 使用 Docker

```bash
# 构建 Docker 镜像
docker build -t log-system:latest .

# 运行容器
docker run -d \
  --name log-system \
  --env-file ../.env.production \
  -p 3000:3000 \
  log-system:latest
```

#### 使用 systemd

创建 systemd 服务文件 `/etc/systemd/system/log-system.service`:

```ini
[Unit]
Description=Log System Service
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/src/main.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable log-system
sudo systemctl start log-system
```

### 步骤 7: 验证部署

1. 检查应用状态：

```bash
# PM2
pm2 status

# systemd
sudo systemctl status log-system

# Docker
docker ps | grep log-system
```

2. 检查日志：

```bash
# PM2
pm2 logs log-system

# systemd
sudo journalctl -u log-system -f

# Docker
docker logs -f log-system
```

3. 测试 API 端点：

```bash
curl http://localhost:3000/health
```

4. 测试数据库连接：

```bash
curl http://localhost:3000/api/v1/system/health/database
```

5. 测试 Redis 连接：

```bash
curl http://localhost:3000/api/v1/system/health/redis
```

## 配置验证

### 1. 数据库连接池验证

```bash
# 查看数据库连接池状态
curl http://localhost:3000/api/v1/system/health/database-pool
```

### 2. Redis 缓存验证

```bash
# 查看 Redis 缓存状态
curl http://localhost:3000/api/v1/system/health/redis-cache
```

### 3. 邮件服务验证

```bash
# 发送测试邮件
curl -X POST http://localhost:3000/api/v1/system/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 4. 备份任务验证

```bash
# 手动触发备份任务
curl -X POST http://localhost:3000/api/v1/system/backup/trigger

# 查看备份状态
curl http://localhost:3000/api/v1/system/backup/status
```

### 5. 监控和告警验证

```bash
# 查看监控统计
curl http://localhost:3000/api/v1/system/monitoring/stats

# 手动触发性能监控
curl -X POST http://localhost:3000/api/v1/system/monitoring/trigger-performance

# 手动触发异常监控
curl -X POST http://localhost:3000/api/v1/system/monitoring/trigger-exception
```

## 性能优化

### 1. 数据库优化

- 根据服务器性能调整连接池大小
- 为日志表创建合适的索引
- 定期清理过期数据
- 使用分表策略存储历史数据

### 2. Redis 优化

- 配置合理的缓存 TTL
- 使用 Redis 持久化（RDB + AOF）
- 监控 Redis 内存使用
- 定期清理过期键

### 3. 应用优化

- 启用 Node.js 集群模式
- 配置反向代理（Nginx）
- 启用 Gzip 压缩
- 使用 CDN 加速静态资源

### 4. 监控优化

- 配置合理的监控阈值
- 启用告警去重机制
- 定期审查和调整告警规则
- 使用专业监控工具（Prometheus、Grafana）

## 安全配置

### 1. 数据库安全

- 使用强密码
- 限制数据库访问 IP
- 启用 SSL/TLS 连接
- 定期备份数据库

### 2. Redis 安全

- 配置 Redis 密码
- 禁用危险命令（FLUSHALL、FLUSHDB）
- 限制 Redis 访问 IP
- 使用 Redis ACL（Redis 6.0+）

### 3. 应用安全

- 使用 HTTPS
- 配置 CORS
- 启用 CSRF 保护
- 启用请求限流
- 定期更新依赖包

### 4. 邮件安全

- 使用 TLS/SSL 加密
- 不要在代码中硬编码密码
- 使用环境变量存储敏感信息
- 定期更换 SMTP 密码

## 监控和维护

### 1. 日常监控

- 监控应用状态和性能
- 监控数据库连接池使用情况
- 监控 Redis 内存使用
- 监控磁盘空间使用
- 监控日志文件大小

### 2. 定期维护

- 每周检查备份任务执行情况
- 每月清理过期日志数据
- 每季度审查和优化配置
- 每年进行安全审计

### 3. 告警处理

- 及时响应告警通知
- 分析告警原因
- 采取相应的处理措施
- 记录处理过程和结果

### 4. 日志管理

- 定期归档历史日志
- 清理过期备份文件
- 监控日志存储空间
- 定期分析日志数据

## 故障排查

### 1. 应用无法启动

**可能原因**:
- 端口被占用
- 数据库连接失败
- Redis 连接失败
- 配置文件错误

**排查步骤**:
1. 检查端口占用：`netstat -tuln | grep 3000`
2. 检查数据库连接：`mysql -h host -u user -p`
3. 检查 Redis 连接：`redis-cli -h host -p port -a password ping`
4. 检查配置文件：验证 `.env.production` 文件

### 2. 数据库连接池耗尽

**可能原因**:
- 连接池配置过小
- 存在慢查询
- 连接泄漏

**排查步骤**:
1. 查看连接池状态
2. 分析慢查询日志
3. 检查代码中的数据库连接使用
4. 增加连接池大小

### 3. Redis 连接失败

**可能原因**:
- Redis 服务未启动
- 网络连接问题
- 密码错误
- 连接数超限

**排查步骤**:
1. 检查 Redis 服务状态：`systemctl status redis`
2. 测试网络连接：`telnet redis-host 6379`
3. 验证密码：`redis-cli -h host -p port -a password ping`
4. 检查 Redis 最大连接数配置

### 4. 邮件发送失败

**可能原因**:
- SMTP 配置错误
- 网络连接问题
- 邮箱密码错误
- 邮件服务器限制

**排查步骤**:
1. 验证 SMTP 配置
2. 测试网络连接：`telnet smtp-host 587`
3. 检查邮箱密码或授权码
4. 查看邮件服务器日志

### 5. 备份任务失败

**可能原因**:
- 磁盘空间不足
- 数据库连接超时
- 权限问题

**排查步骤**:
1. 检查磁盘空间：`df -h`
2. 检查备份日志
3. 验证文件权限
4. 手动触发备份任务测试

## 回滚方案

### 1. 应用回滚

```bash
# PM2
pm2 stop log-system
pm2 delete log-system
# 切换到旧版本代码
pm2 start dist/src/main.js --name "log-system" --env production

# Docker
docker stop log-system
docker rm log-system
docker run -d --name log-system <old-image>
```

### 2. 数据库回滚

```bash
# 恢复数据库备份
mysql -u user -p database < backup.sql

# 或使用 Prisma 迁移回滚
npx prisma migrate resolve --rolled-back <migration-name>
```

### 3. 配置回滚

```bash
# 恢复旧的配置文件
cp .env.production.backup .env.production

# 重启应用
pm2 restart log-system
```

## 联系支持

如有问题，请联系技术支持团队：

- 邮箱: support@example.com
- 电话: +86-xxx-xxxx-xxxx
- 工单系统: https://support.example.com

## 附录

### A. 常用命令

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs log-system

# 重启应用
pm2 restart log-system

# 停止应用
pm2 stop log-system

# 查看数据库连接
mysql -u user -p -e "SHOW PROCESSLIST;"

# 查看 Redis 信息
redis-cli -h host -p port -a password INFO

# 清理日志文件
find storage/logs/ -name "*.log" -mtime +30 -delete
```

### B. 配置文件模板

参考 `.env.example` 文件获取完整的配置模板。

### C. 监控指标

- CPU 使用率
- 内存使用率
- 磁盘使用率
- 网络流量
- 数据库连接数
- Redis 内存使用
- API 响应时间
- 错误日志数量
- 告警数量

### D. 性能基准

- API 响应时间: < 1 秒
- 数据库查询时间: < 200 毫秒
- Redis 查询时间: < 10 毫秒
- 日志写入速率: < 1000 条/分钟
- 错误率: < 1%
