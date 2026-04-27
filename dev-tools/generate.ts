import * as fs from 'fs';
import * as path from 'path';

/**
 * 增强版数据生成工具
 * 生成更真实的订单、对话、评价数据，支持敏感词命中断点和流失风险分析场景
 */

// 基础资源池
const PRODUCTS = [
  { id: 'P001', name: '雷犀 Pro 降噪耳机', price: 1299, category: '数码' },
  { id: 'P002', name: '智能客服机器人 X1', price: 9999, category: '软件' },
  { id: 'P003', name: '无线机械键盘 G5', price: 599, category: '数码' },
  { id: 'P004', name: '人体工学办公椅', price: 1580, category: '家居' },
  { id: 'P005', name: '4K 超清显示器 27寸', price: 2499, category: '数码' },
];

const NAMES = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '孙九', '周十'];
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'];

// 扩展场景库（与数据库 seed 保持一致并扩展）
const SCENARIOS = [
  {
    name: '常规咨询-满意',
    tags: ['产品咨询', '正向'],
    satisfaction: 5,
    messages: [
      { role: 'customer', content: '请问这款耳机降噪效果怎么样？' },
      { role: 'agent', content: '您好！这款耳机采用了最新的自适应降噪技术，能够过滤98%的环境噪音。' },
      { role: 'customer', content: '那电池能撑多久？' },
      { role: 'agent', content: '满电状态下开启降噪可使用30小时，支持快充哦。' },
    ]
  },
  {
    name: '发货投诉-纠纷',
    tags: ['发货缓慢', '服务态度', '负面'],
    satisfaction: 1,
    messages: [
      { role: 'customer', content: '都一个星期了，为什么还没发货？' },
      { role: 'agent', content: '抱歉，由于订单量较大，仓库正在抓紧排单。' },
      { role: 'customer', content: '别拿订单量说事，我看别人后买的都收到了！' },
      { role: 'agent', content: '爱买不买，不行你就退款吧，没空跟你废话。' },
      { role: 'customer', content: '你这是什么态度？我要投诉你！' },
      { role: 'agent', content: '随便你，笨蛋。' },
    ]
  },
  {
    name: '价格保护-流失',
    tags: ['价保申请', '询单流失', '风险'],
    satisfaction: 2,
    messages: [
      { role: 'customer', content: '我刚买完就降价了50元，能退差价吗？' },
      { role: 'agent', content: '不好意思亲，活动已经结束了，无法补差价。' },
      { role: 'customer', content: '可是我还没收到货呢，这样我只能拒签重买了。' },
      { role: 'agent', content: '那您随意吧，我们也没办法。' },
      { role: 'customer', content: '好吧，那我不想要了，申请退款了。' },
    ]
  },
  {
    name: '违规导流-严重',
    tags: ['线下交易', '违规', '高风险'],
    satisfaction: 1,
    messages: [
      { role: 'customer', content: '这个价格还能再少点吗？' },
      { role: 'agent', content: '亲，加我微信吧，私下转账给你打8折，平台抽成太高了。' },
      { role: 'customer', content: '好的，微信号是多少？' },
      { role: 'agent', content: 'xxxxx，加完备注一下。' },
    ]
  },
  {
    name: '商品瑕疵-售后',
    tags: ['质量问题', '换货咨询'],
    satisfaction: 3,
    messages: [
      { role: 'customer', content: '收到的椅子腿有划痕，怎么办？' },
      { role: 'agent', content: '非常抱歉！请拍照发给我，我们立即为您安排免费换货。' },
      { role: 'customer', content: '麻烦快一点，急着搬家。' },
      { role: 'agent', content: '没问题，今天下午就为您寄出新的。' },
    ]
  }
];

// 生成订单数据
const generateOrders = (platform: string, count: number) => {
  const orders = [];
  for (let i = 0; i < count; i++) {
    const product = PRODUCTS[i % PRODUCTS.length];
    const status = ['WAIT_BUYER_PAY', 'WAIT_SELLER_SEND_GOODS', 'WAIT_BUYER_CONFIRM_GOODS', 'TRADE_FINISHED', 'TRADE_CLOSED'][Math.floor(Math.random() * 5)];
    orders.push({
      order_sn: `${platform.toUpperCase()}_${Date.now()}_${i}`,
      buyer_name: NAMES[i % NAMES.length],
      city: CITIES[i % CITIES.length],
      product_id: product.id,
      product_name: product.name,
      order_amount: product.price,
      order_status: status,
      create_time: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  return orders;
};

// 生成对话数据
const generateChats = (platform: string, count: number) => {
  const chats = [];
  for (let i = 0; i < count; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length];
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    chats.push({
      session_no: `MOCK_SESS_${platform.toUpperCase()}_${String(i).padStart(6, '0')}`,
      customer_name: NAMES[i % NAMES.length],
      scenario: scenario.name,
      satisfaction: scenario.satisfaction,
      tags: scenario.tags,
      messages: scenario.messages.map((msg, idx) => ({
        ...msg,
        timestamp: new Date(date.getTime() + idx * 60000).toISOString(),
      })),
    });
  }
  return chats;
};

// 主函数
const main = () => {
  const platforms = ['jd', 'pdd', 'taobao'];
  const baseDir = path.join(process.cwd(), 'data-templates');

  console.log('\n🚀 开始生成增强版 Mock 测试数据...\n');

  platforms.forEach((platform) => {
    const dir = path.join(baseDir, platform);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const orders = generateOrders(platform, 200);
    fs.writeFileSync(path.join(dir, 'orders.json'), JSON.stringify(orders, null, 2));

    const chats = generateChats(platform, 200);
    fs.writeFileSync(path.join(dir, 'chats.json'), JSON.stringify(chats, null, 2));

    console.log(`✅ ${platform.toUpperCase()}: 已生成 ${orders.length} 条订单, ${chats.length} 组对话数据`);
  });

  console.log('\n🎉 Mock 数据生成完成！位置：dev-tools/data-templates/');
};

main();
