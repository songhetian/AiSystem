# 预览功能端点使用说明

## 端点信息

**路径:** `POST /api/quality-prompts/preview`

**权限:** `service:quality-prompt:preview`

**装饰器:**
- `@AntiShake(1000)` - 防抖1秒
- `@RateLimit({ limit: 20, window: 60 })` - 限流:60秒内最多20次请求
- `@QueryOptimize({ slowQueryThreshold: 500, timeout: 5000 })` - 查询优化

## 功能说明

该端点允许用户在保存Prompt前预览质检效果,执行测试质检但不持久化结果到数据库。

**验证需求:** Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7

## 请求参数

### PreviewPromptDto

```typescript
{
  content: string;           // Prompt内容
  test_conversation: string; // 测试对话内容
}
```

### 示例请求

```json
{
  "content": "禁止使用粗俗语言。必须使用礼貌用语。不得承诺无法兑现的服务。",
  "test_conversation": "您好,请问有什么可以帮助您的吗?我们会尽力为您解决问题。"
}
```

## 响应格式

```typescript
{
  score: number;              // 质检分数 (0-100)
  violations: Array<{         // 违规列表
    source: 'global' | 'department';
    rule: string;             // 违规规则描述
    deduction: number;        // 扣分
    promptId: string;         // Prompt ID
    promptName: string;       // Prompt名称
  }>;
  suggestions: string[];      // 改进建议
  summary: {                  // 汇总信息
    totalViolations: number;  // 总违规数
    totalDeduction: number;   // 总扣分
    passed: boolean;          // 是否及格 (>=60分)
  };
}
```

### 示例响应

#### 场景1: 无违规

```json
{
  "score": 100,
  "violations": [],
  "suggestions": [],
  "summary": {
    "totalViolations": 0,
    "totalDeduction": 0,
    "passed": true
  }
}
```

#### 场景2: 有违规

```json
{
  "score": 92,
  "violations": [
    {
      "source": "global",
      "rule": "未满足规则:必须使用礼貌用语",
      "deduction": 3,
      "promptId": "preview-temp",
      "promptName": "Preview Prompt"
    },
    {
      "source": "global",
      "rule": "违反规则:禁止使用粗俗语言",
      "deduction": 5,
      "promptId": "preview-temp",
      "promptName": "Preview Prompt"
    }
  ],
  "suggestions": [
    "存在2项全局质检标准违规,建议加强客服培训和话术规范。"
  ],
  "summary": {
    "totalViolations": 2,
    "totalDeduction": 8,
    "passed": true
  }
}
```

## 实现细节

### 质检逻辑

1. **创建临时Prompt对象**
   - 不保存到数据库
   - 使用固定ID: `preview-temp`
   - 标记为全局类型

2. **执行质检**
   - 调用 `QualityInspectionHelperService.checkPromptViolations()`
   - 检查"禁止"、"必须"、"不得"等关键词规则
   - 返回违规列表

3. **计算分数**
   - 基础分: 100分
   - 每个违规扣除相应分数
   - 最低分: 0分 (使用 `Math.max(0, baseScore - totalDeduction)`)

4. **生成建议**
   - 调用 `QualityInspectionHelperService.generatePromptSuggestions()`
   - 根据违规类型生成改进建议

5. **返回结果**
   - 不持久化到数据库
   - 仅返回预览结果

## 使用场景

1. **Prompt编辑器预览**
   - 用户在编辑Prompt时点击"预览"按钮
   - 输入测试对话内容
   - 查看质检效果

2. **Prompt调试**
   - 测试不同的Prompt规则
   - 验证规则是否生效
   - 优化Prompt内容

3. **培训和演示**
   - 展示质检逻辑
   - 培训客服人员
   - 演示质检标准

## 注意事项

1. **不持久化结果**
   - 预览结果不会保存到数据库
   - 不会创建审计日志
   - 不会影响缓存

2. **性能考虑**
   - 限流保护: 60秒内最多20次请求
   - 防抖保护: 1秒内只能提交一次
   - 查询超时: 5秒

3. **权限要求**
   - 需要 `service:quality-prompt:preview` 权限
   - 通常授予Super Admin和Department Manager

## 测试用例

### 测试1: 正常预览

```bash
curl -X POST http://localhost:3000/api/quality-prompts/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "禁止使用粗俗语言。必须使用礼貌用语。",
    "test_conversation": "您好,请问有什么可以帮助您的吗?"
  }'
```

### 测试2: 多个违规

```bash
curl -X POST http://localhost:3000/api/quality-prompts/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "禁止使用粗俗语言、脏话、侮辱性词汇。必须使用礼貌用语、敬语。",
    "test_conversation": "这个产品真垃圾!退款!"
  }'
```

### 测试3: 无违规

```bash
curl -X POST http://localhost:3000/api/quality-prompts/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "必须使用礼貌用语。",
    "test_conversation": "您好,非常感谢您的反馈,我们会尽快为您处理。"
  }'
```

## 相关文件

- **Controller:** `backend/src/modules/service/controllers/quality-prompt.controller.ts`
- **DTO:** `backend/src/modules/service/dto/preview-prompt.dto.ts`
- **Service:** `backend/src/modules/service/services/quality-inspection-helper.service.ts`
- **Tests:** `backend/src/modules/service/controllers/quality-prompt.controller.spec.ts`

## 后续优化建议

1. **AI集成**
   - 当前使用简单的关键词匹配
   - 可以集成AI模型进行语义分析
   - 提供更准确的质检结果

2. **批量预览**
   - 支持一次预览多个测试对话
   - 返回批量预览结果

3. **历史记录**
   - 可选地保存预览历史
   - 方便用户查看之前的预览结果

4. **实时预览**
   - WebSocket支持
   - 实时显示质检结果
