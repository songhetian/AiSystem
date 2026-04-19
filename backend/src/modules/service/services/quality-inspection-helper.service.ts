import { Injectable } from '@nestjs/common';

/**
 * 质检辅助服务
 * 提供基于Prompt的质检逻辑
 * Task 3.1: 实现违规来源标记(global/department)
 */
@Injectable()
export class QualityInspectionHelperService {
  /**
   * 基于Prompt检查违规（简化版本）
   * 在实际应用中，应该调用AI模型进行语义分析
   * Task 3.1: 标记违规来源(global/department)
   */
  checkPromptViolations(
    content: string,
    prompts: {
      globalPrompts: Array<{ id: string; name: string; content: string; source: 'global' }>;
      departmentPrompts: Array<{ id: string; name: string; content: string; source: 'department' }>;
    },
  ): Array<{ source: 'global' | 'department'; rule: string; deduction: number; promptId: string; promptName: string }> {
    const violations: Array<{ source: 'global' | 'department'; rule: string; deduction: number; promptId: string; promptName: string }> = [];

    // 检查全局Prompt
    for (const prompt of prompts.globalPrompts) {
      const promptViolations = this.checkSinglePrompt(content, prompt.content, 'global', prompt.id, prompt.name);
      violations.push(...promptViolations);
    }

    // 检查部门Prompt
    for (const prompt of prompts.departmentPrompts) {
      const promptViolations = this.checkSinglePrompt(content, prompt.content, 'department', prompt.id, prompt.name);
      violations.push(...promptViolations);
    }

    return violations;
  }

  /**
   * 检查单个Prompt的违规
   */
  private checkSinglePrompt(
    content: string,
    promptContent: string,
    source: 'global' | 'department',
    promptId: string,
    promptName: string,
  ): Array<{ source: 'global' | 'department'; rule: string; deduction: number; promptId: string; promptName: string }> {
    const violations: Array<{ source: 'global' | 'department'; rule: string; deduction: number; promptId: string; promptName: string }> = [];

    // 检查"禁止"相关的规则
    const prohibitedMatches = promptContent.match(/禁止[^。！？\n]*/g);
    if (prohibitedMatches) {
      for (const rule of prohibitedMatches) {
        const keywords = rule.replace('禁止', '').split(/[、，,]/);
        for (const keyword of keywords) {
          const trimmed = keyword.trim();
          if (trimmed && content.includes(trimmed)) {
            violations.push({
              source,
              rule: `违反规则：${rule}`,
              deduction: 5,
              promptId,
              promptName,
            });
          }
        }
      }
    }

    // 检查"必须"相关的规则
    const requiredMatches = promptContent.match(/必须[^。！？\n]*/g);
    if (requiredMatches) {
      for (const rule of requiredMatches) {
        const keywords = rule.replace('必须', '').split(/[、，,]/);
        let hasAny = false;
        for (const keyword of keywords) {
          const trimmed = keyword.trim();
          if (trimmed && content.includes(trimmed)) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny && keywords.length > 0) {
          violations.push({
            source,
            rule: `未满足规则：${rule}`,
            deduction: 3,
            promptId,
            promptName,
          });
        }
      }
    }

    // 检查"不得"相关的规则
    const notAllowedMatches = promptContent.match(/不得[^。！？\n]*/g);
    if (notAllowedMatches) {
      for (const rule of notAllowedMatches) {
        const keywords = rule.replace('不得', '').split(/[、，,]/);
        for (const keyword of keywords) {
          const trimmed = keyword.trim();
          if (trimmed && content.includes(trimmed)) {
            violations.push({
              source,
              rule: `违反规则：${rule}`,
              deduction: 5,
              promptId,
              promptName,
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * 生成基于Prompt的建议
   * Task 3.1: 区分全局和部门违规的建议
   */
  generatePromptSuggestions(violations: Array<{ source: string; rule: string; deduction: number; promptId?: string; promptName?: string }>): string[] {
    const suggestions: string[] = [];

    const globalViolations = violations.filter((v) => v.source === 'global');
    const departmentViolations = violations.filter((v) => v.source === 'department');

    if (globalViolations.length > 0) {
      suggestions.push(`存在${globalViolations.length}项全局质检标准违规，建议加强客服培训和话术规范。`);
    }

    if (departmentViolations.length > 0) {
      suggestions.push(`存在${departmentViolations.length}项部门质检标准违规，建议复核部门专项要求。`);
    }

    return suggestions;
  }
}
