# 多语言Prompt支持实现说明

## 概述

本文档说明如何实现Prompt内容的多语言版本支持。根据需求24.4-24.6，系统应支持Prompt内容存储多语言版本。

## 实现方案

### 1. 数据模型设计

#### 方案A: 语言代码后缀（推荐）

在Prompt名称中使用语言代码后缀来区分不同语言版本：

```typescript
// 示例
{
  name: "politeness_check_zh",  // 中文版本
  content: "请检查客服是否使用了礼貌用语...",
  language: "zh-CN"
}

{
  name: "politeness_check_en",  // 英文版本
  content: "Please check if the agent used polite language...",
  language: "en-US"
}
```

**优点:**
- 简单直观，易于实现
- 不需要修改现有数据库表结构
- 可以通过名称快速识别语言版本

**缺点:**
- 需要手动管理不同语言版本的关联关系
- 名称可能较长

#### 方案B: 独立语言字段

在数据库表中添加 `language` 字段和 `base_prompt_id` 字段：

```sql
ALTER TABLE service_quality_prompt_global
ADD COLUMN language VARCHAR(10) DEFAULT 'zh-CN',
ADD COLUMN base_prompt_id VARCHAR(50) NULL COMMENT '基础Prompt ID，用于关联不同语言版本';

ALTER TABLE service_quality_prompt_department
ADD COLUMN language VARCHAR(10) DEFAULT 'zh-CN',
ADD COLUMN base_prompt_id VARCHAR(50) NULL COMMENT '基础Prompt ID，用于关联不同语言版本';
```

**优点:**
- 数据结构更清晰
- 易于查询和管理同一Prompt的不同语言版本
- 支持更复杂的多语言场景

**缺点:**
- 需要修改数据库表结构
- 需要更新现有的API和业务逻辑

### 2. 前端实现

#### 2.1 语言选择器

在Prompt编辑表单中添加语言选择器：

```tsx
<Form.Item
  label="语言"
  name="language"
  rules={[{ required: true, message: '请选择语言' }]}
>
  <Select
    placeholder="请选择语言"
    options={[
      { label: '中文', value: 'zh-CN' },
      { label: 'English', value: 'en-US' },
    ]}
  />
</Form.Item>
```

#### 2.2 多语言版本管理

在Prompt列表中显示语言标签：

```tsx
<Tag color={record.language === 'zh-CN' ? 'blue' : 'green'}>
  {record.language === 'zh-CN' ? '中文' : 'English'}
</Tag>
```

#### 2.3 语言版本关联

如果使用方案B，可以在详情页显示同一Prompt的其他语言版本：

```tsx
<Descriptions.Item label="其他语言版本">
  {otherLanguageVersions.map(version => (
    <Tag key={version.id} color="blue">
      <a onClick={() => handleViewVersion(version)}>
        {version.language}
      </a>
    </Tag>
  ))}
</Descriptions.Item>
```

### 3. 后端实现

#### 3.1 API修改

在创建和更新Prompt的DTO中添加 `language` 字段：

```typescript
export class SaveGlobalPromptDto {
  @ApiProperty({ description: 'Prompt名称' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Prompt内容' })
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiProperty({ description: '适用场景' })
  @IsString()
  @MaxLength(500)
  applicable_scenarios: string;

  @ApiProperty({ description: '语言代码', required: false, default: 'zh-CN' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiProperty({ description: '基础Prompt ID（用于关联不同语言版本）', required: false })
  @IsOptional()
  @IsString()
  base_prompt_id?: string;

  // ... 其他字段
}
```

#### 3.2 查询逻辑

在查询Prompt时，根据用户的语言偏好返回对应语言版本：

```typescript
async findGlobalPrompts(query: QueryPromptsDto, userLanguage: string) {
  const where: any = {
    platform_id: query.platform_id,
    enabled: query.enabled,
  };

  // 优先返回用户语言版本，如果不存在则返回默认语言（中文）
  if (userLanguage) {
    where.OR = [
      { language: userLanguage },
      { language: 'zh-CN' },
    ];
  }

  return this.prisma.service_quality_prompt_global.findMany({
    where,
    orderBy: { sort: 'asc' },
  });
}
```

#### 3.3 质检执行

在执行质检时，根据会话的语言环境选择对应语言的Prompt：

```typescript
async executeQualityInspection(sessionId: string) {
  const session = await this.getSession(sessionId);
  const userLanguage = session.language || 'zh-CN';

  // 获取对应语言的全局Prompt
  const globalPrompts = await this.findGlobalPrompts({
    platform_id: session.platform_id,
    enabled: 1,
  }, userLanguage);

  // 获取对应语言的部门Prompt
  const departmentPrompts = await this.findDepartmentPrompts({
    platform_id: session.platform_id,
    dept_id: session.dept_id,
    enabled: 1,
  }, userLanguage);

  // 合并Prompt并执行质检
  const mergedPrompts = [...globalPrompts, ...departmentPrompts];
  return this.performInspection(session, mergedPrompts);
}
```

### 4. 实施步骤

1. **阶段1: 数据库迁移**
   - 创建数据库迁移脚本，添加 `language` 和 `base_prompt_id` 字段
   - 为现有Prompt记录设置默认语言为 'zh-CN'

2. **阶段2: 后端API更新**
   - 更新DTO类，添加语言字段
   - 更新服务层逻辑，支持按语言查询
   - 更新质检执行逻辑，根据语言选择Prompt

3. **阶段3: 前端UI更新**
   - 在Prompt表单中添加语言选择器
   - 在Prompt列表中显示语言标签
   - 添加语言版本管理功能

4. **阶段4: 测试和验证**
   - 测试多语言Prompt的创建和查询
   - 测试质检执行时的语言选择逻辑
   - 测试语言版本的关联和管理

### 5. 注意事项

1. **向后兼容性**: 确保现有的Prompt记录在添加语言字段后仍能正常工作
2. **默认语言**: 系统应有明确的默认语言（建议为中文 zh-CN）
3. **语言回退**: 如果请求的语言版本不存在，应回退到默认语言
4. **缓存策略**: 多语言Prompt的缓存键应包含语言代码
5. **审计日志**: 语言字段的变更应记录在审计日志中

### 6. 示例代码

#### 创建多语言Prompt

```typescript
// 创建中文版本
await qualityPromptApi.createGlobalPrompt({
  name: 'politeness_check',
  content: '请检查客服是否使用了礼貌用语...',
  applicable_scenarios: '所有客服对话',
  language: 'zh-CN',
  enabled: 1,
  platform_id: '1',
  sort: 0,
});

// 创建英文版本（关联到同一base_prompt_id）
await qualityPromptApi.createGlobalPrompt({
  name: 'politeness_check',
  content: 'Please check if the agent used polite language...',
  applicable_scenarios: 'All customer service conversations',
  language: 'en-US',
  base_prompt_id: 'same-id-as-chinese-version',
  enabled: 1,
  platform_id: '1',
  sort: 0,
});
```

#### 查询特定语言的Prompt

```typescript
// 查询英文版本的Prompt
const prompts = await qualityPromptApi.listGlobalPrompts({
  platform_id: '1',
  enabled: 1,
  language: 'en-US',
});
```

## 总结

多语言Prompt支持是一个重要的国际化功能。推荐使用方案B（独立语言字段），因为它提供了更好的数据结构和查询灵活性。实施时应注意向后兼容性和语言回退机制，确保系统在各种语言环境下都能正常工作。
