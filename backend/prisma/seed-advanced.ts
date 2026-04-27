import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.LOCAL_DATABASE_URL,
    },
  },
});

const PLATFORM_ID = 'seed-platform-main';
const DEPT_ID = 'seed-department-customer-service';
const SHOP_ID = 'seed-shop-customer-service';

// 敏感词池
const SENSITIVE_TERMS = [
  { term: '加微信', category: '线下交易', severity: 3, description: '诱导线下交易' },
  { term: '私下转账', category: '线下交易', severity: 3, description: '诱导线下转账' },
  { term: '笨蛋', category: '服务态度', severity: 2, description: '侮辱性词汇' },
  { term: '投诉也没用', category: '服务态度', severity: 2, description: '态度生硬' },
  { term: '滚', category: '服务态度', severity: 3, description: '严厉禁止' },
  { term: '去死', category: '服务态度', severity: 3, description: '严重违规' },
  { term: '不买别问', category: '服务态度', severity: 2, description: '服务态度差' },
  { term: '赔偿1000', category: '过度承诺', severity: 2, description: '随意承诺金额' },
  { term: '绝对不会坏', category: '过度承诺', severity: 1, description: '绝对化表述' },
  { term: '垃圾商品', category: '诋毁', severity: 2, description: '诋毁自家商品' },
];

// 质检规则池
const QUALITY_RULES = [
  { rule_name: '响应超时', rule_type: 'timeout', deduct_score: 10, response_timeout_sec: 60 },
  { rule_name: '违规导流', rule_type: 'prohibited_words', deduct_score: 50, trigger_keywords: ['加微信', '私聊', '转账'] },
  { rule_name: '辱骂客户', rule_type: 'attitude', deduct_score: 100, trigger_keywords: ['笨蛋', '滚', '垃圾'] },
  { rule_name: '过度承诺', rule_type: 'over_promise', deduct_score: 20, trigger_keywords: ['保证', '绝对', '赔偿'] },
];

// 真实对话场景
const SCENARIOS = [
  {
    name: '常规咨询-满意',
    loss_risk: 'low',
    sentiment: 'positive',
    messages: [
      { role: 'customer', content: '请问这款耳机降噪效果怎么样？' },
      { role: 'agent', content: '您好！这款耳机采用了最新的自适应降噪技术，能够过滤98%的环境噪音，非常适合在地铁或飞机上使用。' },
      { role: 'customer', content: '那电池能撑多久？' },
      { role: 'agent', content: '满电状态下开启降噪可使用30小时，支持快充，充电10分钟即可使用3小时哦。' },
      { role: 'customer', content: '好的，谢谢。' },
      { role: 'agent', content: '不客气，如果您下单的话，今天就可以为您发出。祝您生活愉快！' },
    ]
  },
  {
    name: '发货投诉-纠纷',
    loss_risk: 'high',
    sentiment: 'negative',
    messages: [
      { role: 'customer', content: '都一个星期了，为什么还没发货？' },
      { role: 'agent', content: '抱歉，由于订单量较大，仓库正在抓紧排单。' },
      { role: 'customer', content: '别拿订单量说事，我看别人后买的都收到了！' },
      { role: 'agent', content: '爱买不买，不行你就退款吧，没空跟你废话。' }, // 态度问题
      { role: 'customer', content: '你这是什么态度？我要投诉你！' },
      { role: 'agent', content: '随便你，笨蛋。' }, // 侮辱
    ]
  },
  {
    name: '价格保护-流失',
    loss_risk: 'high',
    sentiment: 'neutral',
    messages: [
      { role: 'customer', content: '我刚买完就降价了50元，能退差价吗？' },
      { role: 'agent', content: '不好意思亲，活动已经结束了，无法补差价。' },
      { role: 'customer', content: '可是我还没收到货呢，这样我只能拒签重买了。' },
      { role: 'agent', content: '那您随意吧，我们也没办法。' }, // 流失风险
      { role: 'customer', content: '好吧，那我不想要了，申请退款了。' },
    ]
  },
  {
    name: '违规导流-严重',
    loss_risk: 'medium',
    sentiment: 'neutral',
    messages: [
      { role: 'customer', content: '这个价格还能再少点吗？' },
      { role: 'agent', content: '平台上价格是固定的。' },
      { role: 'customer', content: '还是觉得贵。' },
      { role: 'agent', content: '亲，加我微信吧，私下转账给你打8折，平台抽成太高了。' }, // 严重违规
      { role: 'customer', content: '好的，微信号是多少？' },
      { role: 'agent', content: 'xxxxx，加完备注一下。' },
    ]
  }
];

async function seed() {
  console.log('🚀 开始填充高级测试数据...');

  // 1. 清理旧数据
  await prisma.service_quality_record.deleteMany({});
  await prisma.service_session_analysis.deleteMany({});
  await prisma.service_session_message.deleteMany({});
  await prisma.service_session.deleteMany({});
  await prisma.service_sensitive_term.deleteMany({});
  await prisma.service_quality_rule.deleteMany({});

  console.log('✅ 已清理旧数据');

  // 2. 插入敏感词
  await prisma.service_sensitive_term.createMany({
    data: SENSITIVE_TERMS.map(t => ({
      ...t,
      platform_id: PLATFORM_ID,
      dept_id: DEPT_ID,
      shop_id: SHOP_ID,
    }))
  });
  console.log(`✅ 已生成 ${SENSITIVE_TERMS.length} 条敏感词`);

  // 3. 插入质检规则
  await prisma.service_quality_rule.createMany({
    data: QUALITY_RULES.map(r => ({
      ...r,
      platform_id: PLATFORM_ID,
      dept_id: DEPT_ID,
      shop_id: SHOP_ID,
    }))
  });
  console.log(`✅ 已生成 ${QUALITY_RULES.length} 条质检规则`);

  // 4. 插入会话及相关分析（生成 100 组）
  let sessionCount = 0;
  for (let i = 0; i < 100; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // 过去 30 天内

    const session = await prisma.service_session.create({
      data: {
        session_no: `SESS_2026_${String(i).padStart(6, '0')}`,
        customer_nickname: `客户_${i}`,
        customer_satisfaction: i % 5 === 0 ? 1 : 5,
        agent_name: `客服_${i % 5}`,
        platform_id: PLATFORM_ID,
        dept_id: DEPT_ID,
        shop_id: SHOP_ID,
        status: 'ended',
        started_at: date,
        ended_at: new Date(date.getTime() + 15 * 60000),
        tags: scenario.name,
      }
    });

    // 消息
    await prisma.service_session_message.createMany({
      data: scenario.messages.map((msg, idx) => ({
        session_id: session.id,
        session_no: session.session_no,
        sender_type: msg.role,
        sender_name: msg.role === 'agent' ? session.agent_name : session.customer_nickname,
        content: msg.content,
        sent_at: new Date(date.getTime() + idx * 60000),
        platform_id: PLATFORM_ID,
        dept_id: DEPT_ID,
        shop_id: SHOP_ID,
      }))
    });

    // 分析结果 (Analysis)
    let score = 100;
    let violations: any[] = [];
    if (scenario.name.includes('纠纷') || scenario.name.includes('违规')) {
      score = 40 + Math.floor(Math.random() * 30);
      violations.push({ type: 'attitude', detail: '发现敏感词或态度不佳' });
    }

    const analysis = await prisma.service_session_analysis.create({
      data: {
        session_id: session.id,
        session_no: session.session_no,
        platform_id: PLATFORM_ID,
        dept_id: DEPT_ID,
        shop_id: SHOP_ID,
        quality_score: score,
        quality_passed: score >= 80 ? 1 : 0,
        loss_risk_level: scenario.loss_risk,
        customer_sentiment: scenario.sentiment,
        summary: `AI 自动分析结果：${scenario.name}场景。`,
        analyzed_at: new Date(),
      }
    });

    // 部分生成质检记录 (Quality Record)
    if (i % 3 === 0) {
      await prisma.service_quality_record.create({
        data: {
          session_id: session.id,
          session_no: session.session_no,
          analysis_id: analysis.id,
          inspection_mode: 'manual',
          inspector_name: '管理员',
          score: score - 5, // 人工复核通常更严格
          passed: score - 5 >= 80 ? 1 : 0,
          comment: '人工复核：同意 AI 的判定，客服存在严重违规。',
          platform_id: PLATFORM_ID,
          dept_id: DEPT_ID,
          shop_id: SHOP_ID,
          inspected_at: new Date(),
        }
      });
    }

    sessionCount++;
  }

  console.log(`✅ 已成功生成 ${sessionCount} 组完整质检测试数据`);
  console.log('🎉 数据库填充完成！');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
