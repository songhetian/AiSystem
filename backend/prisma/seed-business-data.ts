import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载根目录环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

/**
 * 工业级测试数据自动化注入脚本 (V10.0)
 * 职责：模拟真实多平台 API 结构注入，包含 JD/TMALL/DY 订单及客服对话流。
 * 运行：npx ts-node prisma/seed-business-data.ts
 */
async function main() {
  console.log('🚀 开始注入多平台真实模拟数据 (从 backend/prisma 运行)...');

  const templatePath = path.join(__dirname, 'data-templates/business-data.json');
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ 模板文件不存在: ${templatePath}`);
    return;
  }
  const rawData = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

  // 1. 获取基础上下文数据
  const platform = await prisma.biz_platform.findFirst({ where: { is_deleted: 0 } });
  const dept = await prisma.biz_department.findFirst({ where: { is_deleted: 0 } });
  const shop = await prisma.biz_shop.findFirst({ where: { is_deleted: 0 } });
  const adminUser = await prisma.sys_user.findFirst({ where: { username: 'admin' } });

  if (!platform || !dept || !shop || !adminUser) {
    console.error('❌ 注入失败：基础数据缺失，请先运行 npx prisma db seed');
    return;
  }

  // 2. 注入多平台订单数据 (JD/TMALL/DOUYIN)
  console.log('📦 正在注入多平台模拟订单 (JD/TMALL/DY)...');
  
  // 京东订单处理
  for (const item of rawData.jd) {
    await (prisma as any).bi_order.upsert({
      where: {
        platform_id_shop_id_external_order_no: {
          platform_id: platform.id,
          shop_id: shop.id,
          external_order_no: item.order_sn
        }
      },
      update: {
        order_status: item.order_state,
        order_amount: item.order_total_price,
        pay_amount: item.order_payment,
        customer_name: item.consignee_info?.fullname,
        address: item.consignee_info?.full_address,
        raw_data: item
      },
      create: {
        id: `JD_${item.order_sn}`,
        platform_id: platform.id,
        dept_id: dept.id,
        shop_id: shop.id,
        external_order_no: item.order_sn,
        order_status: item.order_state,
        order_amount: item.order_total_price,
        pay_amount: item.order_payment,
        customer_name: item.consignee_info?.fullname,
        address: item.consignee_info?.full_address,
        order_time: new Date(item.order_time),
        pay_time: item.pay_time ? new Date(item.pay_time) : null,
        raw_data: item
      }
    });
  }

  // 天猫订单处理
  for (const item of rawData.tmall) {
    await (prisma as any).bi_order.upsert({
      where: {
        platform_id_shop_id_external_order_no: {
          platform_id: platform.id,
          shop_id: shop.id,
          external_order_no: item.tid
        }
      },
      update: {
        order_status: item.status,
        order_amount: item.total_fee,
        pay_amount: item.payment,
        customer_name: item.receiver_name,
        address: item.receiver_address,
        raw_data: item
      },
      create: {
        id: `TM_${item.tid}`,
        platform_id: platform.id,
        dept_id: dept.id,
        shop_id: shop.id,
        external_order_no: item.tid,
        order_status: item.status,
        order_amount: item.total_fee,
        pay_amount: item.payment,
        customer_name: item.receiver_name,
        address: item.receiver_address,
        order_time: new Date(item.created),
        pay_time: item.pay_time ? new Date(item.pay_time) : null,
        raw_data: item
      }
    });
  }

  // 抖音订单处理
  for (const item of rawData.douyin) {
    await (prisma as any).bi_order.upsert({
      where: {
        platform_id_shop_id_external_order_no: {
          platform_id: platform.id,
          shop_id: shop.id,
          external_order_no: item.order_id
        }
      },
      update: {
        order_status: item.order_status_desc,
        order_amount: item.order_amount / 100, // 分转元
        pay_amount: item.pay_amount / 100,
        customer_name: item.post_addr?.detail,
        address: `${item.post_addr?.province?.name}${item.post_addr?.city?.name}${item.post_addr?.detail}`,
        raw_data: item
      },
      create: {
        id: `DY_${item.order_id}`,
        platform_id: platform.id,
        dept_id: dept.id,
        shop_id: shop.id,
        external_order_no: item.order_id,
        order_status: item.order_status_desc,
        order_amount: item.order_amount / 100,
        pay_amount: item.pay_amount / 100,
        customer_name: item.post_addr?.detail,
        address: `${item.post_addr?.province?.name}${item.post_addr?.city?.name}${item.post_addr?.detail}`,
        order_time: new Date(item.create_time * 1000),
        raw_data: item
      }
    });
  }

  // 3. 注入客服会话及消息 (真实对话流)
  console.log('💬 正在注入客服会话及消息流...');
  for (const sessionData of rawData.service_sessions) {
    const session = await (prisma as any).service_session.upsert({
      where: { session_no: sessionData.session_no },
      update: { status: sessionData.status, customer_satisfaction: sessionData.satisfaction },
      create: {
        id: `SESSION_${sessionData.session_no}`,
        session_no: sessionData.session_no,
        customer_nickname: sessionData.customer_nickname,
        customer_satisfaction: sessionData.satisfaction,
        platform_id: platform.id,
        dept_id: dept.id,
        shop_id: shop.id,
        agent_user_id: adminUser.id,
        agent_name: adminUser.name,
        status: sessionData.status,
        started_at: new Date(),
        last_message_at: new Date()
      }
    });

    for (const [idx, msg] of sessionData.messages.entries()) {
      await (prisma as any).service_session_message.upsert({
        where: { id: `MSG_${sessionData.session_no}_${idx}` },
        update: {},
        create: {
          id: `MSG_${sessionData.session_no}_${idx}`,
          session_id: session.id,
          session_no: session.session_no,
          sender_type: msg.role,
          sender_name: msg.role === 'agent' ? adminUser.name : sessionData.customer_nickname,
          sender_id: msg.role === 'agent' ? adminUser.id : null,
          content: msg.content,
          sent_at: new Date(Date.now() + msg.time_offset * 1000),
          platform_id: platform.id,
          dept_id: dept.id,
          shop_id: shop.id
        }
      });
    }
  }

  // 4. 注入知识库对话
  console.log('🧠 正在注入知识库模拟对话...');
  for (const chat of rawData.knowledge_chats) {
    const chatSession = await (prisma as any).knowledge_chat_session.create({
      data: {
        id: `K_CHAT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: chat.title,
        user_id: adminUser.id,
        platform_id: platform.id,
        dept_id: dept.id
      }
    });

    for (const msg of chat.messages) {
      await (prisma as any).knowledge_chat_message.create({
        data: {
          session_id: chatSession.id,
          role: msg.role,
          content: msg.content,
          create_time: new Date(msg.time)
        }
      });
    }
  }

  // 5. 注入 API 集成日志 (模拟 JD/TMALL API 调用)
  console.log('📝 正在模拟平台 API 集成日志...');
  await (prisma as any).sys_integration_log.createMany({
    data: [
      {
        platform_id: platform.id,
        dept_id: dept.id,
        biz_type: 'FETCH_ORDERS_JD',
        log_level: 'INFO',
        message: 'Successfully fetched orders from JD.com',
        request_payload: JSON.stringify({ method: 'jd.orders.search', vender_id: '10001' }),
        response_data: JSON.stringify({ code: 200, total: 2, data: rawData.jd }),
        duration_ms: 450
      },
      {
        platform_id: platform.id,
        dept_id: dept.id,
        biz_type: 'FETCH_ORDERS_TMALL',
        log_level: 'INFO',
        message: 'Successfully fetched orders from Tmall',
        request_payload: JSON.stringify({ method: 'taobao.trades.sold.get' }),
        response_data: JSON.stringify({ code: 200, total: 1, data: rawData.tmall }),
        duration_ms: 820
      }
    ]
  });

  console.log('✅ 真实模拟数据注入完成！');
}

main()
  .catch((e) => {
    console.error('❌ 注入过程中发生异常:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
