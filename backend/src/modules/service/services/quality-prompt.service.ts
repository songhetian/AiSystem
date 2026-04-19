import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { RedisService } from '../../../common/services/redis.service';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { SaveGlobalPromptDto } from '../dto/save-global-prompt.dto';
import { SaveDepartmentPromptDto } from '../dto/save-department-prompt.dto';
import { QueryPromptsDto } from '../dto/query-prompts.dto';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';
import { BatchPromptOperationDto } from '../dto/batch-prompt-operation.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class QualityPromptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly redisService: RedisService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Delegate methods for type-safe table access
  private get globalPromptDelegate() {
    return this.prisma['service_quality_prompt_global' as keyof typeof this.prisma] as any;
  }

  private get departmentPromptDelegate() {
    return this.prisma['service_quality_prompt_department' as keyof typeof this.prisma] as any;
  }

  private get versionDelegate() {
    return this.prisma['service_quality_prompt_version' as keyof typeof this.prisma] as any;
  }

  private get auditLogDelegate() {
    return this.prisma['service_quality_prompt_audit_log' as keyof typeof this.prisma] as any;
  }

  // ==================== Global Prompt Management ====================

  async queryGlobalPrompts(dto: QueryPromptsDto, userId: string) {
    const { name, enabled, platform_id, page = 1, pageSize = 20 } = dto;
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = platform_id || scope.platform_id;

    if (!platformId) {
      throw new BadRequestException('Platform ID cannot be empty');
    }

    const where: any = {
      platform_id: platformId,
      is_deleted: 0,
    };

    if (name) {
      where.name = { contains: name };
    }

    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    const [total, list] = await Promise.all([
      this.globalPromptDelegate().count({ where }),
      this.globalPromptDelegate().findMany({
        where,
        orderBy: [{ sort: 'asc' }, { create_time: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, list, page, pageSize };
  }

  async getGlobalPromptById(id: string, userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const prompt = await this.globalPromptDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        is_deleted: 0,
      },
    });

    if (!prompt) {
      throw new NotFoundException('Global Prompt not found');
    }

    return prompt;
  }

  async createGlobalPrompt(dto: SaveGlobalPromptDto, userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    if (!scope.platform_id) {
      throw new BadRequestException('Platform ID cannot be empty');
    }

    const existing = await this.globalPromptDelegate().findFirst({
      where: {
        name: dto.name,
        platform_id: scope.platform_id,
        is_deleted: 0,
      },
    });

    if (existing) {
      throw new BadRequestException('Global Prompt name already exists');
    }

    const prompt = await this.globalPromptDelegate().create({
      data: {
        ...dto,
        platform_id: scope.platform_id,
        created_by: userId,
        updated_by: userId,
        version: 1,
      },
    });

    await this.createVersionRecord(prompt.id, 'global', prompt, userId, userName, 'Create Prompt');
    await this.createAuditLog({
      operation_type: 'create',
      operator_id: userId,
      operator_name: userName,
      prompt_id: prompt.id,
      prompt_type: 'global',
      prompt_name: prompt.name,
      after_content: prompt.content,
      platform_id: scope.platform_id,
      request_ip: requestIp,
    });

    await this.invalidateCache(scope.platform_id);
    return prompt;
  }

  async updateGlobalPrompt(id: string, dto: SaveGlobalPromptDto, userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const oldPrompt = await this.globalPromptDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        is_deleted: 0,
      },
    });

    if (!oldPrompt) {
      throw new NotFoundException('Global Prompt not found');
    }

    if (dto.name !== oldPrompt.name) {
      const existing = await this.globalPromptDelegate().findFirst({
        where: {
          name: dto.name,
          platform_id: scope.platform_id,
          is_deleted: 0,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('Global Prompt name already exists');
      }
    }

    const prompt = await this.globalPromptDelegate().update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
        version: oldPrompt.version + 1,
      },
    });

    await this.createVersionRecord(prompt.id, 'global', prompt, userId, userName, 'Update Prompt');
    await this.createAuditLog({
      operation_type: 'edit',
      operator_id: userId,
      operator_name: userName,
      prompt_id: prompt.id,
      prompt_type: 'global',
      prompt_name: prompt.name,
      before_content: oldPrompt.content,
      after_content: prompt.content,
      platform_id: scope.platform_id,
      request_ip: requestIp,
    });

    await this.invalidateCache(scope.platform_id);
    return prompt;
  }

  async deleteGlobalPrompt(id: string, userId: string, userName: string, reason?: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const prompt = await this.globalPromptDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        is_deleted: 0,
      },
    });

    if (!prompt) {
      throw new NotFoundException('Global Prompt not found');
    }

    const referenced = await this.departmentPromptDelegate().findFirst({
      where: {
        parent_global_prompt_ids: { array_contains: id },
        is_deleted: 0,
      },
    });

    if (referenced) {
      throw new BadRequestException('This Global Prompt is referenced by Department Prompts and cannot be deleted');
    }

    await this.globalPromptDelegate().update({
      where: { id },
      data: {
        is_deleted: 1,
        updated_by: userId,
      },
    });

    await this.createAuditLog({
      operation_type: 'delete',
      operator_id: userId,
      operator_name: userName,
      prompt_id: id,
      prompt_type: 'global',
      prompt_name: prompt.name,
      delete_reason: reason,
      platform_id: scope.platform_id,
      request_ip: requestIp,
    });

    await this.invalidateCache(scope.platform_id);
    return { success: true };
  }

  async toggleGlobalPromptStatus(id: string, enabled: number, userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const prompt = await this.globalPromptDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        is_deleted: 0,
      },
    });

    if (!prompt) {
      throw new NotFoundException('Global Prompt not found');
    }

    await this.globalPromptDelegate().update({
      where: { id },
      data: {
        enabled,
        updated_by: userId,
      },
    });

    await this.createAuditLog({
      operation_type: enabled ? 'enable' : 'disable',
      operator_id: userId,
      operator_name: userName,
      prompt_id: id,
      prompt_type: 'global',
      prompt_name: prompt.name,
      platform_id: scope.platform_id,
      request_ip: requestIp,
    });

    await this.invalidateCache(scope.platform_id);
    return { success: true };
  }

  // ==================== Department Prompt Management ====================

  async queryDepartmentPrompts(dto: QueryPromptsDto, userId: string) {
    const { name, enabled, platform_id, dept_id, page = 1, pageSize = 20 } = dto;
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = platform_id || scope.platform_id;
    const deptId = dept_id || scope.dept_id;

    if (!platformId || !deptId) {
      throw new BadRequestException('Platform ID and Department ID cannot be empty');
    }

    const where: any = {
      platform_id: platformId,
      dept_id: deptId,
      is_deleted: 0,
    };

    if (name) {
      where.name = { contains: name };
    }

    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    const [total, list] = await Promise.all([
      this.departmentPromptDelegate().count({ where }),
      this.departmentPromptDelegate().findMany({
        where,
        orderBy: [{ sort: 'asc' }, { create_time: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, list, page, pageSize };
  }

  async getDepartmentPromptById(id: string, userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const prompt = await this.departmentPromptDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
        is_deleted: 0,
      },
    });

    if (!prompt) {
      throw new NotFoundException('Department Prompt not found');
    }

    return prompt;
  }

  async createDepartmentPrompt(dto: SaveDepartmentPromptDto, userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    if (!scope.platform_id || !scope.dept_id) {
      throw new BadRequestException('Platform ID and Department ID cannot be empty');
    }

    const existing = await this.departmentPromptDelegate().findFirst({
      where: {
        name: dto.name,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
        is_deleted: 0,
      },
    });

    if (existing) {
      throw new BadRequestException('Department Prompt name already exists');
    }

    const prompt = await this.departmentPromptDelegate().create({
      data: {
        ...dto,
        parent_global_prompt_ids: dto.parent_global_prompt_ids || [],
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
        created_by: userId,
        updated_by: userId,
        version: 1,
      },
    });

    await this.createVersionRecord(prompt.id, 'department', prompt, userId, userName, 'Create Prompt');
    await this.createAuditLog({
      operation_type: 'create',
      operator_id: userId,
      operator_name: userName,
      prompt_id: prompt.id,
      prompt_type: 'department',
      prompt_name: prompt.name,
      after_content: prompt.content,
      platform_id: scope.platform_id,
      dept_id: scope.dept_id,
      request_ip: requestIp,
    });

    await this.invalidateCache(scope.platform_id, scope.dept_id);
    return prompt;
  }

  async updateDepartmentPrompt(id: string, dto: SaveDepartmentPromptDto, userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const oldPrompt = await this.departmentPromptDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
        is_deleted: 0,
      },
    });

    if (!oldPrompt) {
      throw new NotFoundException('Department Prompt not found');
    }

    if (dto.name !== oldPrompt.name) {
      const existing = await this.departmentPromptDelegate().findFirst({
        where: {
          name: dto.name,
          platform_id: scope.platform_id,
          dept_id: scope.dept_id,
          is_deleted: 0,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('Department Prompt name already exists');
      }
    }

    const prompt = await this.departmentPromptDelegate().update({
      where: { id },
      data: {
        ...dto,
        parent_global_prompt_ids: dto.parent_global_prompt_ids || [],
        updated_by: userId,
        version: oldPrompt.version + 1,
      },
    });

    await this.createVersionRecord(prompt.id, 'department', prompt, userId, userName, 'Update Prompt');
    await this.createAuditLog({
      operation_type: 'edit',
      operator_id: userId,
      operator_name: userName,
      prompt_id: prompt.id,
      prompt_type: 'department',
      prompt_name: prompt.name,
      before_content: oldPrompt.content,
      after_content: prompt.content,
      platform_id: scope.platform_id,
      dept_id: scope.dept_id,
      request_ip: requestIp,
    });

    await this.invalidateCache(scope.platform_id, scope.dept_id);
    return prompt;
  }

  async deleteDepartmentPrompt(id: string, userId: string, userName: string, reason?: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const prompt = await this.departmentPromptDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
        is_deleted: 0,
      },
    });

    if (!prompt) {
      throw new NotFoundException('Department Prompt not found');
    }

    await this.departmentPromptDelegate().update({
      where: { id },
      data: {
        is_deleted: 1,
        updated_by: userId,
      },
    });

    await this.createAuditLog({
      operation_type: 'delete',
      operator_id: userId,
      operator_name: userName,
      prompt_id: id,
      prompt_type: 'department',
      prompt_name: prompt.name,
      delete_reason: reason,
      platform_id: scope.platform_id,
      dept_id: scope.dept_id,
      request_ip: requestIp,
    });

    await this.invalidateCache(scope.platform_id, scope.dept_id);
    return { success: true };
  }

  async toggleDepartmentPromptStatus(id: string, enabled: number, userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const prompt = await this.departmentPromptDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
        is_deleted: 0,
      },
    });

    if (!prompt) {
      throw new NotFoundException('Department Prompt not found');
    }

    await this.departmentPromptDelegate().update({
      where: { id },
      data: {
        enabled,
        updated_by: userId,
      },
    });

    await this.createAuditLog({
      operation_type: enabled ? 'enable' : 'disable',
      operator_id: userId,
      operator_name: userName,
      prompt_id: id,
      prompt_type: 'department',
      prompt_name: prompt.name,
      platform_id: scope.platform_id,
      dept_id: scope.dept_id,
      request_ip: requestIp,
    });

    await this.invalidateCache(scope.platform_id, scope.dept_id);
    return { success: true };
  }

  // ==================== Batch Operations ====================

  async batchEnablePrompts(dto: BatchPromptOperationDto, promptType: 'global' | 'department', userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const delegate = promptType === 'global' ? this.globalPromptDelegate() : this.departmentPromptDelegate();

    const where: any = {
      id: { in: dto.ids },
      platform_id: scope.platform_id,
      is_deleted: 0,
    };

    if (promptType === 'department') {
      where.dept_id = scope.dept_id;
    }

    await delegate.updateMany({
      where,
      data: {
        enabled: 1,
        updated_by: userId,
      },
    });

    for (const id of dto.ids) {
      await this.createAuditLog({
        operation_type: 'enable',
        operator_id: userId,
        operator_name: userName,
        prompt_id: id,
        prompt_type: promptType,
        prompt_name: `Batch Enable-${id}`,
        platform_id: scope.platform_id,
        dept_id: promptType === 'department' ? scope.dept_id : undefined,
        request_ip: requestIp,
      });
    }

    await this.invalidateCache(scope.platform_id, promptType === 'department' ? scope.dept_id : undefined);
    return { success: true, count: dto.ids.length };
  }

  async batchDisablePrompts(dto: BatchPromptOperationDto, promptType: 'global' | 'department', userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const delegate = promptType === 'global' ? this.globalPromptDelegate() : this.departmentPromptDelegate();

    const where: any = {
      id: { in: dto.ids },
      platform_id: scope.platform_id,
      is_deleted: 0,
    };

    if (promptType === 'department') {
      where.dept_id = scope.dept_id;
    }

    await delegate.updateMany({
      where,
      data: {
        enabled: 0,
        updated_by: userId,
      },
    });

    for (const id of dto.ids) {
      await this.createAuditLog({
        operation_type: 'disable',
        operator_id: userId,
        operator_name: userName,
        prompt_id: id,
        prompt_type: promptType,
        prompt_name: `Batch Disable-${id}`,
        platform_id: scope.platform_id,
        dept_id: promptType === 'department' ? scope.dept_id : undefined,
        request_ip: requestIp,
      });
    }

    await this.invalidateCache(scope.platform_id, promptType === 'department' ? scope.dept_id : undefined);
    return { success: true, count: dto.ids.length };
  }

  // ==================== Import/Export Operations ====================

  async exportGlobalPrompts(query: QueryPromptsDto, userId: string): Promise<Buffer> {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = query.platform_id || scope.platform_id;

    if (!platformId) {
      throw new BadRequestException('Platform ID cannot be empty');
    }

    const where: any = {
      platform_id: platformId,
      is_deleted: 0,
    };

    if (query.name) {
      where.name = { contains: query.name };
    }

    if (query.enabled !== undefined) {
      where.enabled = query.enabled;
    }

    const prompts = await this.globalPromptDelegate().findMany({
      where,
      orderBy: [{ sort: 'asc' }, { create_time: 'desc' }],
    });

    const data = prompts.map((p: any) => ({
      Name: p.name,
      Content: p.content,
      'Applicable Scenarios': p.applicable_scenarios || '',
      Enabled: p.enabled ? 'Yes' : 'No',
      Version: p.version,
      'Created At': p.create_time ? new Date(p.create_time).toISOString() : '',
      'Updated At': p.update_time ? new Date(p.update_time).toISOString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Global Prompts');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportDepartmentPrompts(query: QueryPromptsDto, userId: string): Promise<Buffer> {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = query.platform_id || scope.platform_id;
    const deptId = query.dept_id || scope.dept_id;

    if (!platformId || !deptId) {
      throw new BadRequestException('Platform ID and Department ID cannot be empty');
    }

    const where: any = {
      platform_id: platformId,
      dept_id: deptId,
      is_deleted: 0,
    };

    if (query.name) {
      where.name = { contains: query.name };
    }

    if (query.enabled !== undefined) {
      where.enabled = query.enabled;
    }

    const prompts = await this.departmentPromptDelegate().findMany({
      where,
      orderBy: [{ sort: 'asc' }, { create_time: 'desc' }],
    });

    const data = prompts.map((p: any) => ({
      Name: p.name,
      Content: p.content,
      'Applicable Scenarios': p.applicable_scenarios || '',
      Enabled: p.enabled ? 'Yes' : 'No',
      Version: p.version,
      'Created At': p.create_time ? new Date(p.create_time).toISOString() : '',
      'Updated At': p.update_time ? new Date(p.update_time).toISOString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Department Prompts');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async importGlobalPrompts(file: Express.Multer.File, userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    if (!scope.platform_id) {
      throw new BadRequestException('Platform ID cannot be empty');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < rows.length; i++) {
      const row: any = rows[i];
      try {
        const dto: SaveGlobalPromptDto = {
          name: row['Name'],
          content: row['Content'],
          applicable_scenarios: row['Applicable Scenarios'] || '',
          enabled: row['Enabled'] === 'Yes' ? 1 : 0,
          sort: i + 1,
        };

        if (!dto.name || !dto.content) {
          throw new Error('Name and Content are required');
        }

        await this.createGlobalPrompt(dto, userId, userName, requestIp);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  async importDepartmentPrompts(file: Express.Multer.File, userId: string, userName: string, requestIp?: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    if (!scope.platform_id || !scope.dept_id) {
      throw new BadRequestException('Platform ID and Department ID cannot be empty');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < rows.length; i++) {
      const row: any = rows[i];
      try {
        const dto: SaveDepartmentPromptDto = {
          name: row['Name'],
          content: row['Content'],
          applicable_scenarios: row['Applicable Scenarios'] || '',
          enabled: row['Enabled'] === 'Yes' ? 1 : 0,
          sort: i + 1,
          parent_global_prompt_ids: [],
        };

        if (!dto.name || !dto.content) {
          throw new Error('Name and Content are required');
        }

        await this.createDepartmentPrompt(dto, userId, userName, requestIp);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  // ==================== Helper Methods ====================

  private async createVersionRecord(
    promptId: string,
    promptType: 'global' | 'department',
    prompt: any,
    userId: string,
    userName: string,
    changeDescription: string,
  ) {
    await this.versionDelegate().create({
      data: {
        prompt_id: promptId,
        prompt_type: promptType,
        version_number: prompt.version,
        name: prompt.name,
        content: prompt.content,
        applicable_scenarios: prompt.applicable_scenarios,
        change_description: changeDescription,
        modified_by: userId,
        modified_by_name: userName,
      },
    });
  }

  private async createAuditLog(data: any) {
    await this.auditLogDelegate().create({
      data,
    });
  }

  private async invalidateCache(platformId: string | null | undefined, deptId?: string | null | undefined) {
    if (!platformId) {
      return;
    }

    if (deptId) {
      const cacheKey = `quality-prompt:${platformId}:${deptId}`;
      await this.redisService.del(cacheKey);
    } else {
      const pattern = `quality-prompt:${platformId}:*`;
      await this.redisService.deleteByPattern(pattern);
    }
  }

  async getMergedPromptsForInspection(platformId: string, deptId: string): Promise<{
    globalPrompts: Array<{ id: string; name: string; content: string; source: 'global' }>;
    departmentPrompts: Array<{ id: string; name: string; content: string; source: 'department' }>;
    mergedContent: string;
  }> {
    const cacheKey = `quality-prompt:${platformId}:${deptId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        await this.redisService.del(cacheKey);
      }
    }

    const globalPrompts = await this.globalPromptDelegate().findMany({
      where: {
        platform_id: platformId,
        enabled: 1,
        is_deleted: 0,
      },
      orderBy: { sort: 'asc' },
      select: {
        id: true,
        name: true,
        content: true,
      },
    });

    const departmentPrompts = await this.departmentPromptDelegate().findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        enabled: 1,
        is_deleted: 0,
      },
      orderBy: { sort: 'asc' },
      select: {
        id: true,
        name: true,
        content: true,
      },
    });

    const globalPromptsWithSource = globalPrompts.map(p => ({ ...p, source: 'global' as const }));
    const departmentPromptsWithSource = departmentPrompts.map(p => ({ ...p, source: 'department' as const }));

    const mergedContent = [
      '# Global Quality Standards',
      ...globalPrompts.map((p, i) => `## ${i + 1}. ${p.name}\n${p.content}`),
      '\n# Department Quality Standards',
      ...departmentPrompts.map((p, i) => `## ${i + 1}. ${p.name}\n${p.content}`),
    ].join('\n\n');

    const result = {
      globalPrompts: globalPromptsWithSource,
      departmentPrompts: departmentPromptsWithSource,
      mergedContent,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 600);
    return result;
  }

  // ==================== Audit Log Operations ====================

  /**
   * 查询审计日志
   * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
   */
  async queryAuditLogs(dto: QueryAuditLogsDto, userId: string) {
    const {
      operator_id,
      operator_name,
      operation_type,
      prompt_id,
      prompt_type,
      platform_id,
      dept_id,
      start_date,
      end_date,
      page = 1,
      pageSize = 20,
    } = dto;

    const scope = await this.scopeService.resolveAccess(userId);

    // Build where clause
    const where: any = {
      platform_id: platform_id || scope.platform_id,
    };

    // Filter by operator
    if (operator_id) {
      where.operator_id = operator_id;
    }

    if (operator_name) {
      where.operator_name = { contains: operator_name };
    }

    // Filter by operation type
    if (operation_type) {
      where.operation_type = operation_type;
    }

    // Filter by prompt
    if (prompt_id) {
      where.prompt_id = prompt_id;
    }

    if (prompt_type) {
      where.prompt_type = prompt_type;
    }

    // Filter by department
    if (dept_id) {
      where.dept_id = dept_id;
    }

    // Filter by date range
    if (start_date || end_date) {
      where.create_time = {};
      if (start_date) {
        where.create_time.gte = new Date(start_date);
      }
      if (end_date) {
        // Include the entire end date
        const endDateTime = new Date(end_date);
        endDateTime.setHours(23, 59, 59, 999);
        where.create_time.lte = endDateTime;
      }
    }

    // Execute query with pagination
    const [total, list] = await Promise.all([
      this.auditLogDelegate.count({ where }),
      this.auditLogDelegate.findMany({
        where,
        orderBy: { create_time: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, list, page, pageSize };
  }

  /**
   * 导出审计日志为CSV
   * **Validates: Requirements 11.6, 11.7**
   */
  async exportAuditLogs(dto: QueryAuditLogsDto, userId: string): Promise<string> {
    const {
      operator_id,
      operator_name,
      operation_type,
      prompt_id,
      prompt_type,
      platform_id,
      dept_id,
      start_date,
      end_date,
    } = dto;

    const scope = await this.scopeService.resolveAccess(userId);

    // Build where clause (same as query)
    const where: any = {
      platform_id: platform_id || scope.platform_id,
    };

    if (operator_id) {
      where.operator_id = operator_id;
    }

    if (operator_name) {
      where.operator_name = { contains: operator_name };
    }

    if (operation_type) {
      where.operation_type = operation_type;
    }

    if (prompt_id) {
      where.prompt_id = prompt_id;
    }

    if (prompt_type) {
      where.prompt_type = prompt_type;
    }

    if (dept_id) {
      where.dept_id = dept_id;
    }

    if (start_date || end_date) {
      where.create_time = {};
      if (start_date) {
        where.create_time.gte = new Date(start_date);
      }
      if (end_date) {
        const endDateTime = new Date(end_date);
        endDateTime.setHours(23, 59, 59, 999);
        where.create_time.lte = endDateTime;
      }
    }

    // Fetch all matching records (no pagination for export)
    const logs = await this.auditLogDelegate.findMany({
      where,
      orderBy: { create_time: 'desc' },
    });

    // Convert to CSV format
    const headers = [
      'ID',
      'Create Time',
      'Operation Type',
      'Operator ID',
      'Operator Name',
      'Prompt ID',
      'Prompt Type',
      'Prompt Name',
      'Before Content',
      'After Content',
      'Delete Reason',
      'Platform ID',
      'Department ID',
      'Request IP',
    ];

    const rows = logs.map((log: any) => [
      log.id,
      log.create_time ? new Date(log.create_time).toISOString() : '',
      log.operation_type,
      log.operator_id,
      log.operator_name,
      log.prompt_id,
      log.prompt_type,
      log.prompt_name,
      this.escapeCsvField(log.before_content || ''),
      this.escapeCsvField(log.after_content || ''),
      this.escapeCsvField(log.delete_reason || ''),
      log.platform_id,
      log.dept_id || '',
      log.request_ip || '',
    ]);

    // Build CSV content
    const csvLines = [
      headers.map(h => this.escapeCsvField(h)).join(','),
      ...rows.map(row => row.map(cell => this.escapeCsvField(String(cell))).join(',')),
    ];

    return csvLines.join('\n');
  }

  /**
   * Escape CSV field to handle commas, quotes, and newlines
   */
  private escapeCsvField(field: string): string {
    if (!field) return '';

    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }

    return field;
  }
}
