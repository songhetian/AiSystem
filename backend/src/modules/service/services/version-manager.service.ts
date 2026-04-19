import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * 版本管理服务
 * 负责管理Prompt的版本历史、查询和回滚
 */
@Injectable()
export class VersionManagerService {
  constructor(private readonly prisma: PrismaService) {}

  // Delegate methods for type-safe table access
  private get versionDelegate() {
    return this.prisma['service_quality_prompt_version' as keyof typeof this.prisma] as any;
  }

  private get globalPromptDelegate() {
    return this.prisma['service_quality_prompt_global' as keyof typeof this.prisma] as any;
  }

  private get departmentPromptDelegate() {
    return this.prisma['service_quality_prompt_department' as keyof typeof this.prisma] as any;
  }

  /**
   * 获取Prompt的版本历史列表
   */
  async getVersionHistory(promptId: string, promptType: 'global' | 'department') {
    const versions = await this.versionDelegate().findMany({
      where: {
        prompt_id: promptId,
        prompt_type: promptType,
      },
      orderBy: {
        version_number: 'desc',
      },
    });

    return versions;
  }

  /**
   * 获取特定版本详情
   */
  async getVersionDetail(promptId: string, versionNumber: number, promptType: 'global' | 'department') {
    const version = await this.versionDelegate().findFirst({
      where: {
        prompt_id: promptId,
        prompt_type: promptType,
        version_number: versionNumber,
      },
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    return version;
  }

  /**
   * 比较两个版本的差异
   */
  async compareVersions(
    promptId: string,
    fromVersion: number,
    toVersion: number,
    promptType: 'global' | 'department',
  ) {
    const [fromVersionData, toVersionData] = await Promise.all([
      this.getVersionDetail(promptId, fromVersion, promptType),
      this.getVersionDetail(promptId, toVersion, promptType),
    ]);

    const diff = {
      fromVersion: fromVersionData,
      toVersion: toVersionData,
      changes: {
        name: fromVersionData.name !== toVersionData.name,
        content: fromVersionData.content !== toVersionData.content,
        applicable_scenarios: fromVersionData.applicable_scenarios !== toVersionData.applicable_scenarios,
      },
      contentDiff: this.generateContentDiff(fromVersionData.content, toVersionData.content),
    };

    return diff;
  }

  /**
   * 生成内容差异（简化版本）
   */
  private generateContentDiff(fromContent: string, toContent: string): ContentDiff {
    if (fromContent === toContent) {
      return {
        type: 'no_change',
        additions: [],
        deletions: [],
        modifications: [],
      };
    }

    // 简化版本：按行比较
    const fromLines = fromContent.split('\n');
    const toLines = toContent.split('\n');

    const additions: string[] = [];
    const deletions: string[] = [];
    const modifications: Array<{ from: string; to: string }> = [];

    // 简单的行级diff算法
    const maxLen = Math.max(fromLines.length, toLines.length);
    for (let i = 0; i < maxLen; i++) {
      const fromLine = fromLines[i] || '';
      const toLine = toLines[i] || '';

      if (fromLine === toLine) {
        continue;
      } else if (!fromLine && toLine) {
        additions.push(toLine);
      } else if (fromLine && !toLine) {
        deletions.push(fromLine);
      } else {
        modifications.push({ from: fromLine, to: toLine });
      }
    }

    return {
      type: 'changed',
      additions,
      deletions,
      modifications,
    };
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(
    promptId: string,
    targetVersion: number,
    promptType: 'global' | 'department',
    userId: string,
    userName: string,
  ) {
    // 获取目标版本数据
    const targetVersionData = await this.getVersionDetail(promptId, targetVersion, promptType);

    // 获取当前Prompt数据
    const delegate = promptType === 'global' ? this.globalPromptDelegate() : this.departmentPromptDelegate();
    const currentPrompt = await delegate.findFirst({
      where: { id: promptId, is_deleted: 0 },
    });

    if (!currentPrompt) {
      throw new NotFoundException('Prompt不存在');
    }

    // 更新Prompt为目标版本的内容
    const updatedPrompt = await delegate.update({
      where: { id: promptId },
      data: {
        name: targetVersionData.name,
        content: targetVersionData.content,
        applicable_scenarios: targetVersionData.applicable_scenarios,
        version: currentPrompt.version + 1,
        updated_by: userId,
      },
    });

    // 创建新版本记录（回滚也算一个新版本）
    await this.versionDelegate().create({
      data: {
        prompt_id: promptId,
        prompt_type: promptType,
        version_number: updatedPrompt.version,
        name: updatedPrompt.name,
        content: updatedPrompt.content,
        applicable_scenarios: updatedPrompt.applicable_scenarios,
        change_description: `回滚到版本 ${targetVersion}`,
        modified_by: userId,
        modified_by_name: userName,
      },
    });

    return {
      success: true,
      currentVersion: updatedPrompt.version,
      rolledBackToVersion: targetVersion,
    };
  }

  /**
   * 获取最新版本号
   */
  async getLatestVersionNumber(promptId: string, promptType: 'global' | 'department'): Promise<number> {
    const latestVersion = await this.versionDelegate().findFirst({
      where: {
        prompt_id: promptId,
        prompt_type: promptType,
      },
      orderBy: {
        version_number: 'desc',
      },
      select: {
        version_number: true,
      },
    });

    return latestVersion?.version_number || 0;
  }

  /**
   * 删除Prompt的所有版本历史（仅在Prompt被删除时调用）
   */
  async deleteVersionHistory(promptId: string, promptType: 'global' | 'department') {
    await this.versionDelegate().deleteMany({
      where: {
        prompt_id: promptId,
        prompt_type: promptType,
      },
    });

    return { success: true };
  }
}

/**
 * 内容差异接口
 */
interface ContentDiff {
  type: 'no_change' | 'changed';
  additions: string[];
  deletions: string[];
  modifications: Array<{ from: string; to: string }>;
}
