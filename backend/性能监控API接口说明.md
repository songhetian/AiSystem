# 性能监控 API 接口说明

## 接口信息

**接口路径**: `POST /api/performance/web-vitals`

**接口说明**: 接收前端上报的 Web Vitals 性能数据

**Content-Type**: `application/json`

---

## 请求参数

### Web Vitals 指标说明

前端会上报以下性能指标：

| 指标名称 | 说明                                        | 单位   | 良好阈值 |
| -------- | ------------------------------------------- | ------ | -------- |
| **CLS**  | Cumulative Layout Shift<br>累积布局偏移     | 无单位 | < 0.1    |
| **FID**  | First Input Delay<br>首次输入延迟           | 毫秒   | < 100ms  |
| **FCP**  | First Contentful Paint<br>首次内容绘制      | 毫秒   | < 1800ms |
| **LCP**  | Largest Contentful Paint<br>最大内容绘制    | 毫秒   | < 2500ms |
| **TTFB** | Time to First Byte<br>首字节时间            | 毫秒   | < 800ms  |
| **INP**  | Interaction to Next Paint<br>交互到下次绘制 | 毫秒   | < 200ms  |

### 请求体示例

```json
{
  "name": "LCP",
  "value": 1234.5,
  "rating": "good",
  "delta": 1234.5,
  "id": "v3-1234567890123-4567890123456",
  "navigationType": "navigate",
  "entries": []
}
```

### 字段说明

| 字段           | 类型   | 必填 | 说明                                     |
| -------------- | ------ | ---- | ---------------------------------------- |
| name           | string | 是   | 指标名称（CLS/FID/FCP/LCP/TTFB/INP）     |
| value          | number | 是   | 指标值                                   |
| rating         | string | 否   | 评级（good/needs-improvement/poor）      |
| delta          | number | 否   | 与上次测量的差值                         |
| id             | string | 否   | 唯一标识符                               |
| navigationType | string | 否   | 导航类型（navigate/reload/back-forward） |
| entries        | array  | 否   | 性能条目详情                             |

---

## 响应格式

### 成功响应

```json
{
  "success": true,
  "message": "性能数据已记录"
}
```

### 失败响应

```json
{
  "success": false,
  "message": "错误信息"
}
```

---

## 实现建议

### 1. 数据库表结构

```sql
CREATE TABLE web_vitals (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(10) NOT NULL,
  metric_value DECIMAL(10, 2) NOT NULL,
  rating VARCHAR(20),
  navigation_type VARCHAR(20),
  user_id VARCHAR(50),
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metric_name (metric_name),
  INDEX idx_created_at (created_at),
  INDEX idx_user_id (user_id)
);
```

### 2. NestJS 控制器示例

```typescript
// backend/src/common/controllers/performance.controller.ts
import { Controller, Post, Body } from "@nestjs/common";

interface WebVitalMetric {
  name: string;
  value: number;
  rating?: string;
  delta?: number;
  id?: string;
  navigationType?: string;
  entries?: any[];
}

@Controller("performance")
export class PerformanceController {
  @Post("web-vitals")
  async recordWebVitals(@Body() metric: WebVitalMetric) {
    try {
      // 1. 验证数据
      if (!metric.name || metric.value === undefined) {
        return { success: false, message: "缺少必要参数" };
      }

      // 2. 保存到数据库
      // await this.performanceService.saveWebVital(metric);

      // 3. 可选：实时告警（如果指标超过阈值）
      if (this.isMetricPoor(metric)) {
        // await this.alertService.sendAlert(metric);
      }

      return { success: true, message: "性能数据已记录" };
    } catch (error) {
      console.error("记录性能数据失败:", error);
      return { success: false, message: "记录失败" };
    }
  }

  private isMetricPoor(metric: WebVitalMetric): boolean {
    const thresholds = {
      CLS: 0.25,
      FID: 300,
      FCP: 3000,
      LCP: 4000,
      TTFB: 1800,
      INP: 500,
    };
    return metric.value > (thresholds[metric.name] || Infinity);
  }
}
```

### 3. 数据分析查询示例

```sql
-- 查询各指标的平均值（最近24小时）
SELECT
  metric_name,
  AVG(metric_value) as avg_value,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  COUNT(*) as sample_count
FROM web_vitals
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY metric_name;

-- 查询性能差的页面（LCP > 4000ms）
SELECT
  page_url,
  AVG(metric_value) as avg_lcp,
  COUNT(*) as count
FROM web_vitals
WHERE metric_name = 'LCP'
  AND metric_value > 4000
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY page_url
ORDER BY avg_lcp DESC
LIMIT 10;

-- 查询用户性能分布
SELECT
  CASE
    WHEN rating = 'good' THEN '良好'
    WHEN rating = 'needs-improvement' THEN '需改进'
    WHEN rating = 'poor' THEN '差'
    ELSE '未知'
  END as performance_level,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM web_vitals
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY rating;
```

---

## 监控面板建议

### 关键指标监控

1. **实时性能趋势图**
   - 展示各指标的时间序列变化
   - 按小时/天/周聚合

2. **性能评分分布**
   - 良好/需改进/差的占比
   - 饼图或柱状图展示

3. **慢页面排行**
   - 按 LCP 排序的页面列表
   - 显示平均加载时间

4. **用户体验指标**
   - FID/INP 交互延迟统计
   - CLS 布局稳定性分析

5. **告警规则**
   - LCP > 4000ms 触发告警
   - FID > 300ms 触发告警
   - CLS > 0.25 触发告警

---

## 前端集成说明

前端已在 `app.tsx` 中启用性能监控：

```typescript
import { reportWebVitals } from "@/utils/performance-monitor";

reportWebVitals((metric) => {
  // 自动上报到 /api/performance/web-vitals
  console.log("[Performance]", metric);
});
```

无需额外配置，性能数据会自动收集并上报。

---

## 注意事项

1. **数据量控制**
   - 建议采样上报（如 10% 用户）
   - 定期清理历史数据（保留 30 天）

2. **隐私保护**
   - 不记录敏感的 URL 参数
   - 用户 ID 脱敏处理

3. **性能影响**
   - 上报接口应异步处理
   - 不阻塞主线程

4. **错误处理**
   - 上报失败不影响用户体验
   - 记录错误日志便于排查

---

**创建时间**: 2026-04-17
**维护者**: 开发团队
