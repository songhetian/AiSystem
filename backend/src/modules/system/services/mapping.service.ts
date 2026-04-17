import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import * as _ from "lodash";

// 错误分类代码 (Section 3.5)
export enum IntegrationErrorCode {
  MAPPING_ERROR = "MAPPING_ERROR", // 字段映射失败
  PERMISSION_DENIED = "PERMISSION_DENIED", // 权限错误
  API_CALL_ERROR = "API_CALL_ERROR", // 外部接口调用失败
  STORAGE_ERROR = "STORAGE_ERROR", // 数据库写入冲突
}

@Injectable()
export class MappingService {
  private readonly logger = new Logger(MappingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get mappingTemplateDelegate() {
    return this.prisma[
      "sys_mapping_template" as keyof typeof this.prisma
    ] as any;
  }

  private get biOrderDelegate() {
    return this.prisma["bi_order" as keyof typeof this.prisma] as any;
  }

  private get biProductDelegate() {
    return this.prisma["bi_product" as keyof typeof this.prisma] as any;
  }

  /**
   * 递归获取合并后的映射规则 (Section 4.4.2 模版联动)
   */
  async getMergedRules(
    templateId: string,
  ): Promise<{
    rules: Record<string, string>;
    cleaning: Record<string, string>;
  }> {
    const template = await this.mappingTemplateDelegate().findUnique({
      where: { id: templateId, is_deleted: 0 },
      include: { parent: true },
    });

    if (!template) {
      throw new Error(`Mapping template ${templateId} not found`);
    }

    let rules = (template.mapping_rules || {}) as Record<string, string>;
    let cleaning = (template.cleaning_rules || {}) as Record<string, string>;

    // 如果有父级，则先获取父级规则并合并 (子覆盖父)
    if (template.parent_id) {
      const parent = await this.getMergedRules(template.parent_id);
      rules = { ...parent.rules, ...rules };
      cleaning = { ...parent.cleaning, ...cleaning };
    }

    return { rules, cleaning };
  }

  /**
   * 根据模版执行数据映射转换
   */
  async transform(templateId: string, rawData: any): Promise<any> {
    const { rules, cleaning } = await this.getMergedRules(templateId);

    if (Array.isArray(rawData)) {
      return rawData.map((item) => this.mapSingle(item, rules, cleaning));
    }

    return this.mapSingle(rawData, rules, cleaning);
  }

  private mapSingle(
    item: any,
    rules: Record<string, string>,
    cleaning: Record<string, string>,
  ) {
    const result: Record<string, any> = {};

    for (const [stdField, externalPath] of Object.entries(rules)) {
      try {
        let value = _.get(item, externalPath);
        if (cleaning[stdField]) {
          value = this.cleanValue(value, cleaning[stdField]);
        }
        result[stdField] = value;
      } catch (e) {
        this.logger.warn(
          `Field ${stdField} mapping failed for path ${externalPath}`,
        );
        result[stdField] = null;
      }
    }

    return result;
  }

  private cleanValue(value: any, rule: string): any {
    if (value === null || value === undefined) return value;
    switch (rule) {
      case "number":
        return Number(value);
      case "string":
        return String(value);
      case "datetime":
        return new Date(value);
      case "trim":
        return typeof value === "string" ? value.trim() : value;
      case "lowercase":
        return typeof value === "string" ? value.toLowerCase() : value;
      default:
        return value;
    }
  }

  /**
   * 标准化订单入库 (Section 4.3)
   */
  async upsertOrders(
    platformId: string,
    shopId: string | null,
    deptId: string,
    mappedOrders: any[],
  ) {
    const results = { created: 0, updated: 0, failed: 0 };
    for (const order of mappedOrders) {
      try {
        await this.biOrderDelegate().upsert({
          where: {
            platform_id_shop_id_external_order_no: {
              platform_id: platformId,
              shop_id: shopId || "",
              external_order_no: order.std_order_no || order.external_order_no,
            },
          },
          update: {
            order_status: order.order_status,
            order_amount: order.order_amount,
            customer_name: order.customer_name,
            address: order.address,
            update_time: new Date(),
            raw_data: order,
          },
          create: {
            platform_id: platformId,
            dept_id: deptId,
            shop_id: shopId || "",
            external_order_no: order.std_order_no || order.external_order_no,
            order_status: order.order_status,
            order_amount: order.order_amount,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            address: order.address,
            order_time: order.order_time
              ? new Date(order.order_time)
              : new Date(),
            raw_data: order,
          },
        });
        results.updated++;
      } catch (error) {
        this.logger.error(`Upsert order failed: ${error.message}`);
        results.failed++;
      }
    }
    return results;
  }

  /**
   * 标准化商品入库 [NEW] (Section 4.3)
   */
  async upsertProducts(
    platformId: string,
    shopId: string | null,
    deptId: string,
    mappedProducts: any[],
  ) {
    const results = { created: 0, updated: 0, failed: 0 };
    for (const prod of mappedProducts) {
      try {
        await this.biProductDelegate().upsert({
          where: {
            platform_id_shop_id_external_spu_id: {
              platform_id: platformId,
              shop_id: shopId || "",
              external_spu_id: prod.std_spu_id || prod.external_spu_id,
            },
          },
          update: {
            product_name: prod.product_name,
            price: prod.price,
            stock: prod.stock,
            status: prod.status,
            main_image: prod.main_image,
            update_time: new Date(),
            raw_data: prod,
          },
          create: {
            platform_id: platformId,
            dept_id: deptId,
            shop_id: shopId || "",
            external_spu_id: prod.std_spu_id || prod.external_spu_id,
            product_name: prod.product_name,
            price: prod.price,
            stock: prod.stock || 0,
            status: prod.status,
            main_image: prod.main_image,
            raw_data: prod,
          },
        });
        results.updated++;
      } catch (error) {
        this.logger.error(`Upsert product failed: ${error.message}`);
        results.failed++;
      }
    }
    return results;
  }
}
