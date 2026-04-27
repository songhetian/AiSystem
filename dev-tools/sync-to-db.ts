import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.LOCAL_DATABASE_URL,
    },
  },
});

const MOCK_API_BASE = `http://localhost:${process.env.MOCK_SERVICE_PORT || 3888}`;
const PLATFORM_CREDENTIALS = {
  jd: { app_key: "jd_leixin_2026", app_secret: "jd_secret_8899" },
  pdd: { app_key: "pdd_leixin_2026", app_secret: "pdd_secret_7788" },
  taobao: { app_key: "tb_leixin_2026", app_secret: "tb_secret_6677" },
};

const PLATFORM_ID = 'seed-platform-main';
const DEPT_ID = 'seed-department-customer-service';
const SHOP_ID = 'seed-shop-customer-service';

// 签名工具
function getSignParams(platform: keyof typeof PLATFORM_CREDENTIALS) {
  const { app_key, app_secret } = PLATFORM_CREDENTIALS[platform];
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 10);
  const sign = crypto
    .createHash("md5")
    .update(`${app_key}${timestamp}${nonce}${app_secret}`)
    .digest("hex");
  return { app_key, timestamp, nonce, sign };
}

async function syncPlatformSessions(platform: 'jd' | 'pdd' | 'taobao') {
  console.log(`\n🔄 正在同步平台 [${platform.toUpperCase()}] 的对话数据...`);
  const params = getSignParams(platform);
  
  try {
    let url = `${MOCK_API_BASE}/api/${platform}/chats`;
    if (platform === 'pdd') url = `${MOCK_API_BASE}/api/pdd/chats/list`;
    if (platform === 'taobao') url = `${MOCK_API_BASE}/api/taobao/im/messages/get`;

    const response = await axios.get(url, { params });
    const chats = platform === 'jd' ? response.data.data.chat_list : 
                 (platform === 'pdd' ? response.data.result.chat_list : response.data.im_messages_get_response.messages.message);

    console.log(`📥 获取到 ${chats.length} 组原始对话`);

    for (const chat of chats) {
      // 1. 创建会话 (Upsert)
      const session = await prisma.service_session.upsert({
        where: { session_no: chat.session_no },
        update: {
          customer_nickname: chat.customer_name || `客户_${chat.session_no}`,
          customer_satisfaction: chat.satisfaction,
          status: 'ended',
          tags: chat.scenario,
        },
        create: {
          session_no: chat.session_no,
          customer_nickname: chat.customer_name || `客户_${chat.session_no}`,
          customer_satisfaction: chat.satisfaction,
          platform_id: PLATFORM_ID,
          dept_id: DEPT_ID,
          shop_id: SHOP_ID,
          status: 'ended',
          started_at: new Date(chat.messages[0].timestamp),
          ended_at: new Date(chat.messages[chat.messages.length - 1].timestamp),
          tags: chat.scenario,
        },
      });

      // 2. 同步消息
      for (const msg of chat.messages) {
        await prisma.service_session_message.create({
          data: {
            session_id: session.id,
            session_no: session.session_no,
            sender_type: msg.role,
            sender_name: msg.role === 'agent' ? '模拟客服' : session.customer_nickname,
            content: msg.content,
            sent_at: new Date(msg.timestamp),
            platform_id: PLATFORM_ID,
            dept_id: DEPT_ID,
            shop_id: SHOP_ID,
          }
        }).catch(() => {}); // 忽略重复消息
      }

      // 3. 模拟触发 AI 分析 (如果尚无分析结果)
      const existingAnalysis = await prisma.service_session_analysis.findFirst({
        where: { session_id: session.id }
      });

      if (!existingAnalysis) {
        await prisma.service_session_analysis.create({
          data: {
            session_id: session.id,
            session_no: session.session_no,
            platform_id: PLATFORM_ID,
            dept_id: DEPT_ID,
            shop_id: SHOP_ID,
            quality_score: Math.floor(Math.random() * 40) + 60,
            quality_passed: Math.random() > 0.2 ? 1 : 0,
            loss_risk_level: chat.scenario.includes('流失') ? 'high' : 'low',
            customer_sentiment: chat.satisfaction > 3 ? 'positive' : 'negative',
            summary: `从 Mock API 同步并自动生成的分析报告 [场景: ${chat.scenario}]`,
            analyzed_at: new Date(),
          }
        });
      }
    }
    console.log(`✅ [${platform.toUpperCase()}] 同步完成`);
  } catch (error: any) {
    console.error(`❌ [${platform.toUpperCase()}] 同步失败:`, error.message);
  }
}

async function main() {
  console.log('🚀 开始数据映射同步 (Mock API -> Real DB)...');
  await syncPlatformSessions('jd');
  await syncPlatformSessions('pdd');
  await syncPlatformSessions('taobao');
  console.log('\n🎉 所有平台同步任务已完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
