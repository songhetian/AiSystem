import { Injectable } from '@nestjs/common';

/**
 * 模板引擎助手 (PRD 2.1.1)
 * 用于处理通知内容中的变量替换，如 ${username} -> "张三"
 */
@Injectable()
export class TemplateEngineHelper {
  
  /**
   * 渲染渲染模板
   * @param content 原始模板内容
   * @param variables 变量键值对
   * @returns 渲染后的内容
   */
  render(content: string, variables: Record<string, any>): string {
    if (!content) return '';
    if (!variables) return content;

    // 使用正则匹配 ${varName} 模式
    return content.replace(/\$\{([^}]+)\}/g, (match, key) => {
      // 支持嵌套对象访问，如 ${order.amount}
      const val = this.getNestedValue(variables, key.trim());
      return val !== undefined ? String(val) : match;
    });
  }

  /**
   * 获取嵌套对象的值 (PRD 弹性需求)
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  /**
   * 提取模板中包含的所有变量名
   */
  extractVariables(content: string): string[] {
    const matches = content.matchAll(/\$\{([^}]+)\}/g);
    const vars = new Set<string>();
    for (const match of matches) {
      vars.add(match[1].trim());
    }
    return Array.from(vars);
  }
}
