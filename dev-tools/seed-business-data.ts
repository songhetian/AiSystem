import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载根目录环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * 工业级测试数据自动化注入脚本 (V14.0)
 * 职责：递归扫描各平台文件夹，分模块注入 50+ 订单、聊天、配置数据。
 */
async function main() {
  console.log('🚀 开始多平台、多模块深度数据注入...');

  const baseDir = path.join(process.cwd(), 'dev-tools', 'data-templates');
  const platforms = ['jd', 'taobao', 'douyin', 'pinduoduo'];

  // 获取上下文
  const platformRef = await prisma.biz_platform.findFirst({ where: { is_deleted: 0 } });
  const deptRef = await prisma.biz_department.findFirst({ where: { is_deleted: 0 } });
  const shopRef = await prisma.biz_shop.findFirst({ where: { is_deleted: 0 } });
  const adminUser = await prisma.sys_user.findFirst({ where: { username: 'admin' } });

  if (!platformRef || !deptRef || !shopRef || !adminUser) {
    console.warn('⚠️ 基础上下文缺失。请先运行 backend/prisma/seed.ts。');
    return;
  }

  for (const p of platforms) {
    const pDir = path.join(baseDir, p);
    if (!fs.existsSync(pDir)) continue;

    console.log(`\n--- 平台: ${p.toUpperCase()} ---`);

    // 1. 注入 API 配置 (api-config.json)
    const apiPath = path.join(pDir, 'api-config.json');
    if (fs.existsSync(apiPath)) {
      const config = JSON.parse(fs.readFileSync(apiPath, 'utf-8'));
      await (prisma as any).sys_api_mapping.upsert({
        where: { id: `MAPPING_${p.toUpperCase()}` },
        update: { mapping_json: config.mapping },
        create: {
          id: `MAPPING_${p.toUpperCase()}`,
          source_name: config.source,
          api_endpoint: config.endpoint,
          method: 'POST',
          mapping_json: config.mapping,
          platform_id: platformRef.id,
          status: 1
        }
      });
      console.log('  ✅ 接口映射配置已同步。');
    }

    // 2. 注入 50+ 订单 (orders.json)
    const ordersPath = path.join(pDir, 'orders.json');
    if (fs.existsSync(ordersPath)) {
      const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
      console.log(`  📦 注入 ${orders.length} 条原始订单...`);
      for (const order of orders) {
        await (prisma as any).bi_order.upsert({
          where: {
            platform_id_shop_id_external_order_no: {
              platform_id: platformRef.id,
              shop_id: shopRef.id,
              external_order_no: order.order_id
            }
          },
          update: { raw_data: order },
          create: {
            id: `${p.toUpperCase()}_${order.order_id}`,
            platform_id: platformRef.id,
            dept_id: deptRef.id,
            shop_id: shopRef.id,
            external_order_no: order.order_id,
            order_status: order.status,
            order_amount: order.amount,
            pay_amount: order.amount * 0.95,
            customer_name: order.customer,
            address: order.address,
            order_time: new Date(order.order_time),
            raw_data: order
          }
        });
      }
    }

    // 3. 注入 50+ 深度对话流 (chats.json)
    const chatsPath = path.join(pDir, 'chats.json');
    if (fs.existsSync(chatsPath)) {
      const sessions = JSON.parse(fs.readFileSync(chatsPath, 'utf-8'));
      console.log(`  💬 注入 ${sessions.length} 组深度聊天会话 (多态度质检素材)...`);
      for (const s of sessions) {
        const session = await (prisma as any).service_session.upsert({
          where: { session_no: s.session_no },
          update: { customer_satisfaction: s.satisfaction },
          create: {
            id: `SESS_${s.session_no}`,
            session_no: s.session_no,
            customer_nickname: `匿名用户_${p}`,
            platform_id: platformRef.id,
            dept_id: deptRef.id,
            shop_id: shopRef.id,
            agent_user_id: adminUser.id,
            agent_name: adminUser.name,
            status: 'closed',
            started_at: new Date(),
            tags: s.tags
          }
        });

        // 批量创建消息，避免单条循环过慢
        const messages = s.messages.map((m: any, idx: number) => ({
          id: `MSG_${s.session_no}_${idx}`,
          session_id: session.id,
          session_no: session.session_no,
          sender_type: m.role,
          sender_name: m.role === 'agent' ? adminUser.name : 'Customer',
          content: m.content,
          sent_at: new Date(),
          platform_id: platformRef.id,
          dept_id: deptRef.id,
          shop_id: shopRef.id
        }));
        await (prisma as any).service_session_message.createMany({ data: messages, skipDuplicates: true });
      }
    // 4. [NEW] 自动配置系统集成链路 (确保一键跑通)
    const mockHost = process.env.MOCK_SERVER_HOST || 'localhost';
    console.log(`  🔧 自动配置系统集成链路 (${p.toUpperCase()})...`);
    await (prisma as any).sys_platform_config.upsert({
      where: { id: `CONFIG_${p.toUpperCase()}` },
      update: {
        api_endpoint: `http://${mockHost}:3888/mock/${p}/order`,
        app_key: 'leixin_2026_prod',
        app_secret: 's3cret_shhh_8899',
        status: 1
      },
      create: {
        id: `CONFIG_${p.toUpperCase()}`,
        platform_id: platformRef.id,
        dept_id: deptRef.id,
        shop_id: shopRef.id,
        api_endpoint: `http://${mockHost}:3888/mock/${p}/order`,
        app_key: 'leixin_2026_prod',
        app_secret: 's3cret_shhh_8899',
        status: 1
      }
    });
  }

  console.log('\n✅ 海量多维模拟数据注入与集成配置完成。');
}

main()
  .catch(e => {
    console.error('❌ 注入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
