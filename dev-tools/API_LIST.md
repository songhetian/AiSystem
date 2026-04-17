# 雷犀系统 - 生产级 API 接入指南 (V20.0)

本 Mock Server 现已模拟真实电商开放平台的签名算法。接入时必须遵循以下安全规范。

## 1. 核心接入凭证
| 参数项 | 值 (Mock 专用) | 存放位置 | 备注 |
| :--- | :--- | :--- | :--- |
| **App Key** | `leixin_2026_prod` | `sys_platform_config.app_key` | 客户端唯一身份标识 |
| **App Secret** | `s3cret_shhh_8899` | `sys_platform_config.app_secret` | **严禁传输**，用于生成签名 |
| **Endpoint** | `http://localhost:3888` | `sys_platform_config.api_endpoint` | 基础访问地址 |

## 2. 签名算法说明
所有请求必须携带 `app_key`, `timestamp`, `nonce`, `sign` 四个安全参数。
- **算法**: `sign = MD5(app_key + timestamp + nonce + app_secret)`
- **有效期**: 5 分钟 (300 秒)

### JavaScript 计算示例 (后端 Node.js 调用)
```javascript
const crypto = require('crypto');
const app_key = 'leixin_2026_prod';
const app_secret = 's3cret_shhh_8899';
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = Math.random().toString(36).substring(2, 10);

const sign = crypto.createHash('md5')
                   .update(`${app_key}${timestamp}${nonce}${app_secret}`)
                   .digest('hex');

// 请求地址: http://localhost:3888/mock/jd/chat?app_key=...&timestamp=...&nonce=...&sign=...
```

## 3. 对应配置页面 (UI) 设置建议
在系统的“平台配置”或“外部分接”页面中，必须包含以下输入项：
1.  **平台类型**: 下拉框 (京东/淘宝/等)
2.  **App Key**: 文本框 (必填)
3.  **App Secret**: 密码框 (必填，后端加密存储)
4.  **接口地址**: 文本框 (默认 Mock 地址或线上地址)
5.  **分页设置**: 指定 pageSize

## 4. 数据库同步 SQL (测试用)
```sql
UPDATE sys_platform_config 
SET app_key = 'leixin_2026_prod',
    app_secret = 's3cret_shhh_8899',
    api_endpoint = 'http://localhost:3888/mock/jd/chat'
WHERE platform_id = 'jd';
```
