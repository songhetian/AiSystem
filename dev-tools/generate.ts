import * as fs from "fs";
import * as path from "path";

/**
 * 真实电商平台测试数据生成脚本
 * 功能：生成京东、拼多多、淘宝的订单和对话数据
 * 数据量：每个平台 120 条订单、120 组对话
 */

// 商品数据（50种真实商品）
const PRODUCTS = [
  {
    id: 1,
    name: "小米13 Pro 12GB+256GB 天玑版",
    price: 2999,
    category: "手机",
  },
  {
    id: 2,
    name: "iPhone 15 Pro Max 256GB 钛金属",
    price: 9999,
    category: "手机",
  },
  { id: 3, name: "华为Mate 60 Pro 12GB+512GB", price: 6999, category: "手机" },
  {
    id: 4,
    name: "OPPO Find X7 Ultra 16GB+512GB",
    price: 5999,
    category: "手机",
  },
  { id: 5, name: "vivo X100 Pro 16GB+512GB", price: 4999, category: "手机" },
  {
    id: 6,
    name: "联想ThinkPad X1 Carbon i7/16GB/512GB",
    price: 12999,
    category: "电脑",
  },
  { id: 7, name: "戴尔XPS 13 i7/16GB/1TB", price: 8999, category: "电脑" },
  {
    id: 8,
    name: "MacBook Pro 14英寸 M3 Pro 18GB/512GB",
    price: 16999,
    category: "电脑",
  },
  {
    id: 9,
    name: "华硕天选4 RTX4060 i7/16GB/1TB",
    price: 6999,
    category: "电脑",
  },
  { id: 10, name: "惠普战66六代 i5/16GB/512GB", price: 4999, category: "电脑" },
  {
    id: 11,
    name: "美的空调 1.5匹 新一级能效 变频",
    price: 2999,
    category: "家电",
  },
  { id: 12, name: "海尔冰箱 500L 十字对开门", price: 4999, category: "家电" },
  { id: 13, name: "格力空调 3匹 柜机 新一级", price: 5999, category: "家电" },
  { id: 14, name: "西门子洗衣机 10kg 滚筒", price: 3999, category: "家电" },
  { id: 15, name: "海信电视 75英寸 4K 120Hz", price: 4999, category: "家电" },
  { id: 16, name: "耐克Air Max 270 男款运动鞋", price: 899, category: "服饰" },
  { id: 17, name: "阿迪达斯Ultra Boost 跑步鞋", price: 1299, category: "服饰" },
  { id: 18, name: "优衣库纯棉T恤 男女同款", price: 99, category: "服饰" },
  { id: 19, name: "Levi's 501经典牛仔裤", price: 599, category: "服饰" },
  {
    id: 20,
    name: "The North Face 冲锋衣 防水透气",
    price: 1999,
    category: "服饰",
  },
  { id: 21, name: "三只松鼠每日坚果 750g", price: 199, category: "食品" },
  { id: 22, name: "良品铺子零食大礼包 1500g", price: 299, category: "食品" },
  { id: 23, name: "蒙牛特仑苏纯牛奶 250ml*16盒", price: 89, category: "食品" },
  { id: 24, name: "五芳斋粽子礼盒 1200g", price: 159, category: "食品" },
  { id: 25, name: "茅台飞天53度 500ml", price: 2999, category: "食品" },
  { id: 26, name: "戴森V15吸尘器 无线手持", price: 4999, category: "家电" },
  { id: 27, name: "小米扫地机器人 X10+", price: 2999, category: "家电" },
  { id: 28, name: "九阳破壁机 Y88", price: 599, category: "家电" },
  { id: 29, name: "美的电饭煲 5L IH加热", price: 799, category: "家电" },
  { id: 30, name: "苏泊尔炒锅 32cm 不粘锅", price: 299, category: "家电" },
  { id: 31, name: "AirPods Pro 2代 主动降噪", price: 1899, category: "数码" },
  { id: 32, name: "索尼WH-1000XM5 降噪耳机", price: 2499, category: "数码" },
  { id: 33, name: "GoPro Hero 12 运动相机", price: 3499, category: "数码" },
  { id: 34, name: "大疆Mini 4 Pro 无人机", price: 4999, category: "数码" },
  { id: 35, name: "罗技MX Master 3S 无线鼠标", price: 799, category: "数码" },
  { id: 36, name: "雅诗兰黛小棕瓶精华 50ml", price: 899, category: "美妆" },
  { id: 37, name: "SK-II神仙水 230ml", price: 1599, category: "美妆" },
  { id: 38, name: "兰蔻小黑瓶精华 100ml", price: 1299, category: "美妆" },
  { id: 39, name: "欧莱雅紫熨斗眼霜 15ml", price: 299, category: "美妆" },
  { id: 40, name: "完美日记口红礼盒 5支装", price: 199, category: "美妆" },
  { id: 41, name: "乐高星球大战 千年隼号", price: 5999, category: "玩具" },
  { id: 42, name: "泡泡玛特MOLLY星座系列", price: 79, category: "玩具" },
  { id: 43, name: "万代高达模型 RG独角兽", price: 399, category: "玩具" },
  { id: 44, name: "费雪婴儿健身架", price: 299, category: "玩具" },
  { id: 45, name: "芭比娃娃梦想豪宅", price: 899, category: "玩具" },
  { id: 46, name: "宜家马尔姆床架 1.8m", price: 1999, category: "家居" },
  { id: 47, name: "顾家家居真皮沙发 三人位", price: 8999, category: "家居" },
  { id: 48, name: "慕思床垫 乳胶独立弹簧 1.8m", price: 6999, category: "家居" },
  { id: 49, name: "林氏木业实木餐桌 1.4m", price: 2999, category: "家居" },
  { id: 50, name: "全友家居衣柜 2.4m 推拉门", price: 3999, category: "家居" },
];

// 客户姓名（100个真实姓名）
const NAMES = [
  "张伟",
  "王芳",
  "李娜",
  "刘洋",
  "陈静",
  "杨帆",
  "赵敏",
  "孙悦",
  "周杰",
  "吴磊",
  "郑强",
  "王丽",
  "李明",
  "刘芳",
  "陈伟",
  "杨静",
  "赵刚",
  "孙丽",
  "周敏",
  "吴强",
  "冯芳",
  "陈涛",
  "褚卫",
  "卫强",
  "蒋敏",
  "沈芳",
  "韩涛",
  "杨磊",
  "朱静",
  "秦伟",
  "尤娜",
  "许洋",
  "何芳",
  "吕刚",
  "施丽",
  "张敏",
  "孔强",
  "曹娜",
  "严磊",
  "华静",
  "金伟",
  "魏芳",
  "陶刚",
  "姜丽",
  "戚敏",
  "谢强",
  "邹娜",
  "喻磊",
  "柏静",
  "水伟",
  "窦芳",
  "章刚",
  "云丽",
  "苏敏",
  "潘强",
  "葛娜",
  "奚磊",
  "范静",
  "彭伟",
  "郎芳",
  "鲁刚",
  "韦丽",
  "昌敏",
  "马强",
  "苗娜",
  "凤磊",
  "花静",
  "方伟",
  "俞芳",
  "任刚",
  "袁丽",
  "柳敏",
  "酆强",
  "鲍娜",
  "史磊",
  "唐静",
  "费伟",
  "廉芳",
  "岑刚",
  "薛丽",
  "雷敏",
  "贺强",
  "倪娜",
  "汤磊",
  "滕静",
  "殷伟",
  "罗芳",
  "毕刚",
  "郝丽",
  "邬敏",
  "安强",
  "常娜",
  "乐磊",
  "于静",
  "时伟",
  "傅芳",
  "皮刚",
  "卞丽",
  "齐敏",
  "康强",
];

// 收货地址（20个真实地址）
const ADDRESSES = [
  "北京市朝阳区建国路88号SOHO现代城A座1201",
  "上海市浦东新区陆家嘴环路1000号恒生银行大厦32层",
  "广州市天河区天河路208号天河城购物中心",
  "深圳市南山区科技园南区深圳湾科技生态园",
  "杭州市西湖区文三路90号东部软件园",
  "成都市武侯区天府大道中段666号希顿国际广场",
  "重庆市渝北区龙溪街道金开大道西段106号",
  "武汉市洪山区光谷大道61号智慧园",
  "南京市玄武区中山东路18号国际贸易中心",
  "西安市雁塔区高新路88号尚品国际",
  "苏州市工业园区星湖街328号创意产业园",
  "天津市和平区南京路189号津汇广场",
  "青岛市市南区香港中路8号青岛中心",
  "长沙市岳麓区麓谷大道658号软件园",
  "郑州市金水区花园路39号国贸中心",
  "济南市历下区泉城路180号齐鲁国际大厦",
  "福州市鼓楼区五四路158号环球广场",
  "厦门市思明区鹭江道8号国际银行大厦",
  "沈阳市沈河区青年大街286号华润大厦",
  "大连市中山区人民路15号国际金融中心",
];

// 生成订单数据
const generateOrders = (platform: string, count: number) => {
  const orders = [];
  for (let i = 0; i < count; i++) {
    const product = PRODUCTS[i % PRODUCTS.length];
    const name = NAMES[i % NAMES.length];
    const address = ADDRESSES[i % ADDRESSES.length];
    const date = new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    );

    if (platform === "jd") {
      orders.push({
        order_sn: `JD${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(i).padStart(6, "0")}`,
        pin: name,
        order_total_price: product.price,
        order_state: i % 3 === 0 ? "WAIT_SELLER_SEND_GOODS" : "TRADE_FINISHED",
        order_time: date.toISOString(),
        consignee_info: {
          fullname: name,
          mobile: `138${String(1000 + i).substring(1)}`,
          address: address,
        },
        sku_list: [
          {
            sku_id: `${product.id}00000`,
            sku_name: product.name,
            price: product.price,
            num: 1,
          },
        ],
      });
    } else if (platform === "pdd") {
      orders.push({
        order_sn: `PDD${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(i).padStart(6, "0")}`,
        order_status: i % 3 === 0 ? 2 : 5,
        order_status_desc: i % 3 === 0 ? "待发货" : "已完成",
        order_amount: product.price,
        receiver_name: name,
        receiver_phone: `139${String(1000 + i).substring(1)}`,
        receiver_address: address,
        goods_list: [
          {
            goods_id: product.id * 1000,
            goods_name: product.name,
            goods_price: product.price,
            goods_count: 1,
          },
        ],
        created_time: Math.floor(date.getTime() / 1000),
      });
    } else if (platform === "taobao") {
      orders.push({
        tid: `TB${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(i).padStart(6, "0")}`,
        buyer_nick: name,
        payment: product.price,
        status: i % 3 === 0 ? "WAIT_SELLER_SEND_GOODS" : "TRADE_FINISHED",
        created: date.toISOString().replace("T", " ").substring(0, 19),
        receiver_name: name,
        receiver_mobile: `137${String(1000 + i).substring(1)}`,
        receiver_address: address,
        orders: {
          order: [
            {
              oid: `${product.id}${String(i).padStart(8, "0")}`,
              title: product.name,
              price: product.price,
              num: 1,
            },
          ],
        },
      });
    }
  }
  return orders;
};

// 质检场景（14种真实场景）
const SCENARIOS = [
  {
    name: "退款纠纷",
    tags: ["退款纠纷", "发货缓慢"],
    satisfaction: 1,
    messages: [
      { role: "customer", content: "你好，我要退款！你们发货太慢了！" },
      {
        role: "agent",
        content: "您好，非常抱歉给您带来不便。请问您的订单号是多少？",
      },
      { role: "customer", content: "都等了5天了，还没发货！我不要了！" },
      {
        role: "agent",
        content: "非常抱歉让您久等了，我马上为您核实物流情况并处理退款。",
      },
    ],
  },
  {
    name: "商品瑕疵",
    tags: ["商品瑕疵", "质量问题"],
    satisfaction: 2,
    messages: [
      { role: "customer", content: "收到的商品有划痕，这是怎么回事？" },
      {
        role: "agent",
        content: "您好，非常抱歉给您带来不好的体验。能否拍照给我看一下？",
      },
      { role: "customer", content: "好的，我发给你。" },
      {
        role: "agent",
        content: "收到照片了，确实有瑕疵。我们立即为您安排换货或退款。",
      },
    ],
  },
  {
    name: "发货催促",
    tags: ["发货催促", "物流查询"],
    satisfaction: 3,
    messages: [
      { role: "customer", content: "什么时候发货啊？" },
      { role: "agent", content: "您好，您的订单预计今天下午发货。" },
      { role: "customer", content: "好的，谢谢。" },
      { role: "agent", content: "不客气，发货后会第一时间通知您。" },
    ],
  },
  {
    name: "价格保护",
    tags: ["价格保护", "价格投诉"],
    satisfaction: 2,
    messages: [
      { role: "customer", content: "我昨天买的，今天就降价了！能退差价吗？" },
      {
        role: "agent",
        content: "您好，我们有价格保护政策。请稍等，我帮您核实。",
      },
      { role: "customer", content: "好的，谢谢。" },
      { role: "agent", content: "核实完毕，差价会在3个工作日内退回您的账户。" },
    ],
  },
  {
    name: "虚假宣传",
    tags: ["虚假宣传", "描述不符"],
    satisfaction: 1,
    messages: [
      { role: "customer", content: "你们的商品描述和实物完全不符！" },
      { role: "agent", content: "您好，非常抱歉。能否详细说明一下哪里不符？" },
      { role: "customer", content: "说好的原装正品，结果是高仿！" },
      {
        role: "agent",
        content: "这个情况非常严重，我们立即为您退款并上报处理。",
      },
    ],
  },
  {
    name: "物流异常",
    tags: ["物流异常", "快递丢失"],
    satisfaction: 2,
    messages: [
      { role: "customer", content: "快递显示已签收，但我没收到！" },
      {
        role: "agent",
        content: "您好，这个情况我们非常重视。我立即联系快递公司核实。",
      },
      { role: "customer", content: "好的，尽快处理。" },
      {
        role: "agent",
        content: "已联系快递，如果确认丢失，我们会立即补发或退款。",
      },
    ],
  },
  {
    name: "售前咨询",
    tags: ["售前咨询", "产品咨询"],
    satisfaction: 5,
    messages: [
      { role: "customer", content: "这款手机支持5G吗？" },
      { role: "agent", content: "您好！支持5G全网通，SA/NSA双模。" },
      { role: "customer", content: "好的，那我下单了。" },
      { role: "agent", content: "感谢您的支持！有任何问题随时联系我。" },
    ],
  },
  {
    name: "技术答疑",
    tags: ["技术答疑", "使用指导"],
    satisfaction: 5,
    messages: [
      { role: "customer", content: "这个功能怎么用？" },
      { role: "agent", content: "您好，我来教您。首先打开设置..." },
      { role: "customer", content: "明白了，谢谢！" },
      { role: "agent", content: "不客气，有问题随时咨询。" },
    ],
  },
  {
    name: "常规售后",
    tags: ["常规售后", "保修咨询"],
    satisfaction: 4,
    messages: [
      { role: "customer", content: "保修期是多久？" },
      { role: "agent", content: "您好，全国联保一年，主要部件三年。" },
      { role: "customer", content: "好的，谢谢。" },
      { role: "agent", content: "不客气，保修卡请妥善保管。" },
    ],
  },
  {
    name: "发票问题",
    tags: ["发票问题", "开票咨询"],
    satisfaction: 4,
    messages: [
      { role: "customer", content: "能开发票吗？" },
      { role: "agent", content: "您好，可以开具电子发票或纸质发票。" },
      { role: "customer", content: "我要纸质发票。" },
      { role: "agent", content: "好的，请提供发票抬头和税号，我们随货寄出。" },
    ],
  },
  {
    name: "老客复购",
    tags: ["老客复购", "优惠咨询"],
    satisfaction: 5,
    messages: [
      { role: "customer", content: "老客户有优惠吗？" },
      {
        role: "agent",
        content: "您好！感谢您的支持！有专属优惠券，我发给您。",
      },
      { role: "customer", content: "太好了，谢谢！" },
      { role: "agent", content: "不客气，欢迎常来！" },
    ],
  },
  {
    name: "客服谩骂",
    tags: ["客服违规", "服务态度"],
    satisfaction: 1,
    messages: [
      { role: "customer", content: "你们的服务太差了！" },
      { role: "agent", content: "你瞎说什么呢？我们服务很好！" },
      { role: "customer", content: "你这是什么态度？" },
      { role: "agent", content: "就这态度，不买拉倒！" },
    ],
  },
  {
    name: "线下交易",
    tags: ["客服违规", "线下交易"],
    satisfaction: 1,
    messages: [
      { role: "customer", content: "能便宜点吗？" },
      { role: "agent", content: "加我微信，私下转账给你优惠。" },
      { role: "customer", content: "好的。" },
      { role: "agent", content: "微信号：xxxxx，转账后我直接发货。" },
    ],
  },
  {
    name: "过度承诺",
    tags: ["客服违规", "过度承诺"],
    satisfaction: 2,
    messages: [
      { role: "customer", content: "质量怎么样？" },
      { role: "agent", content: "宇宙第一！终身质保！绝对不会坏！" },
      { role: "customer", content: "真的吗？" },
      { role: "agent", content: "100%保证，用一辈子都没问题！" },
    ],
  },
];

// 生成对话数据
const generateChats = (platform: string, count: number) => {
  const chats = [];
  for (let i = 0; i < count; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length];
    const date = new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    );

    chats.push({
      session_no: `SESS_${platform.toUpperCase()}_${String(i).padStart(6, "0")}`,
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
  const platforms = ["jd", "pdd", "taobao"];
  const baseDir = path.join(process.cwd(), "data-templates");

  console.log("\n🚀 开始生成测试数据...\n");

  platforms.forEach((platform) => {
    const dir = path.join(baseDir, platform);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 生成订单
    const orders = generateOrders(platform, 120);
    fs.writeFileSync(
      path.join(dir, "orders.json"),
      JSON.stringify(orders, null, 2),
    );

    // 生成对话
    const chats = generateChats(platform, 120);
    fs.writeFileSync(
      path.join(dir, "chats.json"),
      JSON.stringify(chats, null, 2),
    );

    console.log(
      `✅ ${platform.toUpperCase()}: 生成 ${orders.length} 条订单, ${chats.length} 组对话`,
    );
  });

  console.log("\n🎉 测试数据生成完成！");
  console.log("\n📁 数据文件位置：");
  console.log("   - dev-tools/data-templates/jd/");
  console.log("   - dev-tools/data-templates/pdd/");
  console.log("   - dev-tools/data-templates/taobao/");
  console.log("\n💡 下一步：");
  console.log("   1. 启动 Mock 服务：npm run mock");
  console.log("   2. 或通过 Docker：cd .. && npm run docker:mock\n");
};

main();
