import * as fs from 'fs';
import * as path from 'path';

/**
 * 工业级模拟数据生成器 (V21.0) - 视觉占位增强版
 * 职责：引入 Avatars, Product Images 占位符，让 UI 演示更“高级”。
 */

const PLATFORMS = ['jd', 'taobao', 'douyin', 'pinduoduo'];
const DATA_COUNT = 100;

// 占位素材库 (使用高品质开放 API)
const PLACEHOLDER_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Gracie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sheba'
];

const PLACEHOLDER_PRODUCTS = [
  'https://picsum.photos/seed/tech1/200/200',
  'https://picsum.photos/seed/tech2/200/200',
  'https://picsum.photos/seed/tech3/200/200'
];

const generateChats = (platform: string) => {
  return Array.from({ length: DATA_COUNT }).map((_, i) => {
    const rounds = 8 + Math.floor(Math.random() * 6);
    const dialogue = [];
    for (let r = 0; r < rounds; r++) {
      dialogue.push({
        role: r % 2 === 0 ? 'customer' : 'agent',
        content: r === 0 ? '你好，我想咨询...' : '好的，请稍等。',
        timestamp: new Date().toISOString()
      });
    }

    return {
      session_id: `SESS_${platform.toUpperCase()}_${i}`,
      // 占位头像，让质检页面不再只有文字
      customer_avatar: PLACEHOLDER_AVATARS[i % PLACEHOLDER_AVATARS.length],
      agent_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Agent',
      messages: dialogue
    };
  });
};

const main = () => {
  const baseDir = path.join(process.cwd(), 'dev-tools', 'data-templates');
  PLATFORMS.forEach(p => {
    const pDir = path.join(baseDir, p);
    if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });

    // 订单数据带上占位商品图
    const orders = Array.from({ length: DATA_COUNT }).map((_, i) => ({
      id: `${p.toUpperCase()}_ORD_${i}`,
      amount: (Math.random() * 500).toFixed(2),
      product_img: PLACEHOLDER_PRODUCTS[i % PLACEHOLDER_PRODUCTS.length], // 视觉占位
      customer: `用户_${i}`,
      time: new Date().toISOString()
    }));

    fs.writeFileSync(path.join(pDir, 'chats.json'), JSON.stringify(generateChats(p), null, 2));
    fs.writeFileSync(path.join(pDir, 'orders.json'), JSON.stringify(orders, null, 2));
    console.log(`✅ [${p.toUpperCase()}] 视觉占位数据已注入。`);
  });
};

main();
