import { Injectable, Logger } from "@nestjs/common";
import { IntegrationErrorCode } from "./mapping.service";
import * as crypto from "crypto";

/**
 * 终极规范化数据采集适配器 (V5.0)
 * 遵循《规范文档.md》：安全签名(Nonce)、敏感信息脱敏(Logger)、标准化重试。
 */

interface PlatformConfigRecord {
  platform_id: string;
  api_endpoint?: string | null;
  app_key?: string | null;
  app_secret?: string | null;
  access_token?: string | null;
  mapping_rules?: any;
}

@Injectable()
export class PlatformIntegrationAdapterService {
  private readonly logger = new Logger(PlatformIntegrationAdapterService.name);

  async *fetchDataStream(
    jobType: string,
    config: PlatformConfigRecord,
    maxPages = 50,
  ) {
    if (!config.api_endpoint)
      throw this.buildError(
        "Endpoint Missing",
        IntegrationErrorCode.API_CALL_ERROR,
      );

    let currentPage = 1;
    let hasMore = true;

    while (hasMore && currentPage <= maxPages) {
      // 1. 打印审计日志 (脱敏处理，规范 8.3)
      this.logger.log(
        `🔄 启动同步任务 [${jobType}] | 平台: ${config.platform_id} | Key: ${config.app_key?.slice(0, 4)}****`,
      );

      const payload = await this.executeRequestWithRetry(config, currentPage);

      // 规范 7.4.1: 从 data.list 提取数据
      const rawItems = payload.data?.list || payload.data || [];

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        hasMore = false;
        break;
      }

      // 2. 字段映射标准化
      const standardizedItems = rawItems.map((item) =>
        this.mapToStandardSchema(item, config.mapping_rules),
      );
      yield standardizedItems;

      hasMore = rawItems.length >= 10;
      currentPage++;
      await new Promise((r) => setTimeout(resolve, 300));
    }
  }

  private async executeRequestWithRetry(
    config: PlatformConfigRecord,
    page: number,
    retries = 3,
  ): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const endpoint = this.buildSignedUrl(config, page);
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const resJson = await response.json();

        // 规范 2.2.1: 校验业务状态码
        if (resJson.code !== 200)
          throw new Error(resJson.message || "业务逻辑异常");

        return resJson;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
  }

  private buildSignedUrl(config: PlatformConfigRecord, page: number): string {
    const url = new URL(config.api_endpoint!);
    const ts = Math.floor(Date.now() / 1000).toString();
    // 规范 8.1: 引入 Nonce 随机字符串
    const nonce = Math.random().toString(36).substr(2, 12);

    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", "50"); // 规范化分页参数名

    if (config.app_key && config.app_secret) {
      const sign = crypto
        .createHash("md5")
        .update(`${config.app_key}${ts}${nonce}${config.app_secret}`)
        .digest("hex");

      url.searchParams.set("app_key", config.app_key);
      url.searchParams.set("timestamp", ts);
      url.searchParams.set("nonce", nonce);
      url.searchParams.set("sign", sign);
    }
    return url.toString();
  }

  private mapToStandardSchema<T extends Record<string, any>>(
    item: T,
    rules: Record<string, any> | null | undefined,
  ): Record<string, any> {
    if (!rules) return { ...item, raw_data: item };
    const result: Record<string, any> = {};
    Object.entries(rules).forEach(([std, ext]) => {
      result[std] = (ext as string).split(".").reduce((o, k) => o?.[k], item);
    });
    result.raw_data = item;
    return result;
  }

  private buildError(msg: string, code: IntegrationErrorCode) {
    return { message: msg, code, timestamp: new Date().toISOString() };
  }
}
