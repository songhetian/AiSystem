import { Injectable } from '@nestjs/common';

/**
 * 冲突校验服务
 * 负责检测部门Prompt与全局Prompt之间的冲突
 */
@Injectable()
export class ConflictValidatorService {
  /**
   * 检测部门Prompt与全局Prompt的冲突
   * @param departmentPromptContent 部门Prompt内容
   * @param globalPrompts 全局Prompt列表
   * @returns 冲突详情数组
   */
  async validateConflicts(
    departmentPromptContent: string,
    globalPrompts: Array<{ id: string; name: string; content: string }>,
  ): Promise<ConflictDetail[]> {
    const conflicts: ConflictDetail[] = [];

    for (const globalPrompt of globalPrompts) {
      const conflict = this.detectConflict(departmentPromptContent, globalPrompt);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * 检测单个全局Prompt与部门Prompt的冲突
   */
  private detectConflict(
    departmentContent: string,
    globalPrompt: { id: string; name: string; content: string },
  ): ConflictDetail | null {
    // 关键词冲突检测规则
    const conflictRules = [
      {
        globalKeywords: ['必须', '应当', '需要', '要求'],
        departmentKeywords: ['不需要', '无需', '不必', '禁止', '不允许'],
        conflictType: 'requirement_contradiction' as const,
      },
      {
        globalKeywords: ['允许', '可以', '支持'],
        departmentKeywords: ['禁止', '不允许', '不可以', '不支持'],
        conflictType: 'permission_contradiction' as const,
      },
      {
        globalKeywords: ['标准', '规范', '统一'],
        departmentKeywords: ['例外', '特殊', '不同于'],
        conflictType: 'standard_deviation' as const,
      },
    ];

    for (const rule of conflictRules) {
      const globalMatches = this.findKeywordMatches(globalPrompt.content, rule.globalKeywords);
      const departmentMatches = this.findKeywordMatches(departmentContent, rule.departmentKeywords);

      if (globalMatches.length > 0 && departmentMatches.length > 0) {
        // 检测是否在相同的语义上下文中
        const contextConflict = this.checkContextConflict(
          globalPrompt.content,
          departmentContent,
          globalMatches,
          departmentMatches,
        );

        if (contextConflict) {
          return {
            globalPromptId: globalPrompt.id,
            globalPromptName: globalPrompt.name,
            conflictType: rule.conflictType,
            conflictLocation: {
              global: globalMatches[0],
              department: departmentMatches[0],
            },
            conflictContent: {
              global: this.extractContext(globalPrompt.content, globalMatches[0]),
              department: this.extractContext(departmentContent, departmentMatches[0]),
            },
            suggestion: this.generateSuggestion(rule.conflictType),
          };
        }
      }
    }

    return null;
  }

  /**
   * 查找关键词匹配
   */
  private findKeywordMatches(content: string, keywords: string[]): number[] {
    const matches: number[] = [];
    for (const keyword of keywords) {
      let index = content.indexOf(keyword);
      while (index !== -1) {
        matches.push(index);
        index = content.indexOf(keyword, index + 1);
      }
    }
    return matches.sort((a, b) => a - b);
  }

  /**
   * 检查上下文冲突
   * 简化版本：检查关键词是否在相似的句子或段落中
   */
  private checkContextConflict(
    globalContent: string,
    departmentContent: string,
    globalMatches: number[],
    departmentMatches: number[],
  ): boolean {
    // 提取全局Prompt和部门Prompt的关键句子
    const globalSentences = this.extractSentences(globalContent, globalMatches[0]);
    const departmentSentences = this.extractSentences(departmentContent, departmentMatches[0]);

    // 检查是否有相似的主题词
    const globalTopics = this.extractTopics(globalSentences);
    const departmentTopics = this.extractTopics(departmentSentences);

    // 如果有共同的主题词，则认为存在上下文冲突
    const commonTopics = globalTopics.filter((topic) => departmentTopics.includes(topic));
    return commonTopics.length > 0;
  }

  /**
   * 提取句子（以句号、问号、感叹号分隔）
   */
  private extractSentences(content: string, position: number): string {
    const sentences = content.split(/[。？！.?!]/);
    let currentPos = 0;

    for (const sentence of sentences) {
      currentPos += sentence.length + 1; // +1 for delimiter
      if (currentPos > position) {
        return sentence.trim();
      }
    }

    return '';
  }

  /**
   * 提取主题词（简化版本：提取名词性词汇）
   */
  private extractTopics(sentence: string): string[] {
    // 简化版本：提取常见的质检相关主题词
    const topicKeywords = [
      '礼貌',
      '用语',
      '回复',
      '响应',
      '时间',
      '态度',
      '服务',
      '客户',
      '问题',
      '解决',
      '流程',
      '规范',
      '标准',
      '合规',
      '敏感词',
      '违规',
      '质检',
      '评分',
      '考核',
    ];

    return topicKeywords.filter((keyword) => sentence.includes(keyword));
  }

  /**
   * 提取上下文（关键词前后各50个字符）
   */
  private extractContext(content: string, position: number): string {
    const start = Math.max(0, position - 50);
    const end = Math.min(content.length, position + 50);
    const context = content.substring(start, end);

    return (start > 0 ? '...' : '') + context + (end < content.length ? '...' : '');
  }

  /**
   * 生成解决建议
   */
  private generateSuggestion(conflictType: ConflictType): string {
    const suggestions: Record<ConflictType, string> = {
      requirement_contradiction: '部门Prompt与全局Prompt的要求存在矛盾。建议修改部门Prompt，使其与全局要求保持一致，或联系管理员调整全局Prompt。',
      permission_contradiction: '部门Prompt与全局Prompt的权限规定存在冲突。建议明确部门特殊权限的适用范围，或遵循全局权限设置。',
      standard_deviation: '部门Prompt偏离了全局标准规范。建议说明部门特殊情况的合理性，或调整部门Prompt以符合全局标准。',
    };

    return suggestions[conflictType];
  }

  /**
   * 批量校验冲突（用于超级管理员覆盖校验）
   */
  async validateConflictsWithOverride(
    departmentPromptContent: string,
    globalPrompts: Array<{ id: string; name: string; content: string }>,
    allowOverride: boolean,
  ): Promise<{ conflicts: ConflictDetail[]; canSave: boolean }> {
    const conflicts = await this.validateConflicts(departmentPromptContent, globalPrompts);

    return {
      conflicts,
      canSave: allowOverride || conflicts.length === 0,
    };
  }
}

/**
 * 冲突类型
 */
type ConflictType = 'requirement_contradiction' | 'permission_contradiction' | 'standard_deviation';

/**
 * 冲突详情
 */
export interface ConflictDetail {
  globalPromptId: string;
  globalPromptName: string;
  conflictType: ConflictType;
  conflictLocation: {
    global: number;
    department: number;
  };
  conflictContent: {
    global: string;
    department: string;
  };
  suggestion: string;
}
