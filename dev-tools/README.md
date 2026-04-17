# 测试数据生成工具

## 功能说明

本工具用于生成真实的电商平台测试数据，包括：

- **京东（JD）**：100+ 订单、客服对话、商品评价
- **拼多多（PDD）**：100+ 订单、客服对话、商品评价
- **淘宝（Taobao）**：100+ 订单、客服对话、商品评价

## 数据特点

### 1. 真实场景

- 退款纠纷、发货延迟、商品瑕疵
- 价格保护、虚假宣传、物流异常
- 售前咨询、技术答疑、老客复购
- 客服违规（谩骂、线下交易、敷衍、过度承诺）

### 2. 质检要点

- 响应时效（首次响应、平均响应）
- 服务态度（礼貌用语、情绪控制）
- 专业能力（问题解决、产品知识）
- 合规性（禁止线下交易、不得谩骂）

### 3. 平台差异

- 京东：订单字段 `order_sn`、`pin`、`order_total_price`
- 拼多多：订单字段 `order_id`、`amount`、`customer`
- 淘宝：订单字段 `tid`、`buyer_nick`、`payment`

## 使用方式

### 1. 生成测试数据

```bash
cd dev-tools
npm install
npm run generate
```

### 2. 导入到数据库

```bash
npm run seed
```

### 3. 启动 Mock 服务器

```bash
npm run mock
```

### 4. Docker 集成

开发环境自动启动 Mock 服务：

```bash
# 启动所有服务（包含 Mock）
npm run docker:up

# Mock 服务地址
http://localhost:3888
```

## 数据结构

### 订单数据（orders.json）

```json
{
  "order_id": "JD_ORD_001",
  "customer": "张三",
  "amount": 299.0,
  "status": "PAID",
  "order_time": "2026-04-15T10:30:00Z",
  "product_name": "小米13 Pro 12GB+256GB",
  "address": "北京市朝阳区xxx"
}
```

### 客服对话（chats.json）

```json
{
  "session_no": "SESS_JD_001",
  "satisfaction": 5,
  "tags": ["售前咨询", "技术答疑"],
  "messages": [
    {
      "role": "customer",
      "content": "这款手机支持5G吗？",
      "timestamp": "2026-04-15T10:30:00Z"
    },
    {
      "role": "agent",
      "content": "您好！支持5G全网通。",
      "timestamp": "2026-04-15T10:30:15Z"
    }
  ]
}
```

### 商品评价（evaluations.json）

```json
{
  "product_id": "SKU_1001",
  "user_name": "User_JD_001",
  "score": 5,
  "comment": "非常满意！质量很好，超出预期！",
  "images": ["https://picsum.photos/200/200"]
}
```

## 质检规则示例

### 1. 响应时效

- 首次响应 < 30秒：优秀
- 首次响应 30-60秒：良好
- 首次响应 > 60秒：需改进

### 2. 禁用词检测

- 谩骂词汇：瞎、穷、傻
- 线下交易：微信、支付宝、私人转账
- 过度承诺：终身质保、宇宙第一

### 3. 满意度评分

- 1星：极差（退款纠纷、客服违规）
- 2星：较差（商品瑕疵、物流异常）
- 3星：一般（发货催促、中性情感）
- 4星：良好（常规售后、发票问题）
- 5星：优秀（售前咨询、老客复购）

## 文件说明

- `generate-data.ts` - 数据生成脚本
- `seed-data.ts` - 数据库导入脚本
- `mock-server.ts` - Mock API 服务器
- `data-templates/` - 生成的测试数据
  - `jd/` - 京东数据
  - `pdd/` - 拼多多数据
  - `taobao/` - 淘宝数据

## 注意事项

1. 测试数据仅用于开发环境
2. 生产环境请使用真实数据
3. Mock 服务器仅监听本地端口
4. 数据生成后会自动保存到 `data-templates/` 目录

---

**更新时间**：2026-04-16
