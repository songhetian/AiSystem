import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

/**
 * 真实电商平台 Mock API Server
 * 功能：模拟京东、拼多多、淘宝的真实接口
 * 特点：独立接口地址、签名验证、分页支持、真实数据
 */

const app = express();
const PORT = 3888;
const BASE_DATA_DIR = path.join(process.cwd(), "data-templates");

// 平台凭证配置（每个平台独立的 key 和 secret）
const PLATFORM_CREDENTIALS = {
  jd: {
    app_key: "jd_leixin_2026",
    app_secret: "jd_secret_8899",
    name: "京东开放平台",
  },
  pdd: {
    app_key: "pdd_leixin_2026",
    app_secret: "pdd_secret_7788",
    name: "拼多多开放平台",
  },
  taobao: {
    app_key: "tb_leixin_2026",
    app_secret: "tb_secret_6677",
    name: "淘宝开放平台",
  },
};

app.use(cors());
app.use(express.json());

// MD5 签名算法：MD5(app_key + timestamp + nonce + app_secret)
const calculateSign = (
  appKey: string,
  ts: string,
  nonce: string,
  secret: string,
): string => {
  return crypto
    .createHash("md5")
    .update(`${appKey}${ts}${nonce}${secret}`)
    .digest("hex");
};

// 签名验证中间件
const verifySign = (platform: "jd" | "pdd" | "taobao") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { app_key, timestamp, nonce, sign } = req.query;

    // 1. 参数校验
    if (!app_key || !timestamp || !nonce || !sign) {
      return res.status(400).json({
        code: 40001,
        message: "缺少必需参数：app_key, timestamp, nonce, sign",
        data: null,
      });
    }

    // 2. app_key 校验
    const credentials = PLATFORM_CREDENTIALS[platform];
    if (app_key !== credentials.app_key) {
      return res.status(403).json({
        code: 40301,
        message: "app_key 无效",
        data: null,
      });
    }

    // 3. 时间戳校验（5分钟有效期）
    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp as string);
    if (Math.abs(now - ts) > 300) {
      return res.status(403).json({
        code: 40302,
        message: "请求已过期（时间戳超过5分钟）",
        data: null,
      });
    }

    // 4. 签名校验
    const expectedSign = calculateSign(
      app_key as string,
      timestamp as string,
      nonce as string,
      credentials.app_secret,
    );

    if (sign !== expectedSign) {
      return res.status(403).json({
        code: 40303,
        message: "签名验证失败",
        data: null,
        debug:
          process.env.NODE_ENV === "development"
            ? {
                expected: expectedSign,
                received: sign,
              }
            : undefined,
      });
    }

    next();
  };
};

// 数据缓存
const dataCache: Record<string, any> = {};

// 加载数据
const loadData = () => {
  ["jd", "pdd", "taobao"].forEach((p) => {
    ["orders", "chats", "evaluations", "products"].forEach((type) => {
      const fp = path.join(BASE_DATA_DIR, p, `${type}.json`);
      if (fs.existsSync(fp)) {
        dataCache[`${p}_${type}`] = JSON.parse(fs.readFileSync(fp, "utf-8"));
        console.log(
          `✅ 加载数据: ${p}/${type}.json (${dataCache[`${p}_${type}`].length} 条)`,
        );
      }
    });
  });
};

// ============================================================================
// 京东开放平台 API
// ============================================================================

// 京东 - 订单列表查询
app.get("/api/jd/orders", verifySign("jd"), (req: Request, res: Response) => {
  const page = parseInt((req.query.page || "1") as string);
  const pageSize = parseInt((req.query.page_size || "20") as string);
  const status = req.query.order_state as string;

  let orders = dataCache["jd_orders"] || [];

  // 状态筛选
  if (status) {
    orders = orders.filter((o: any) => o.order_state === status);
  }

  const total = orders.length;
  const list = orders.slice((page - 1) * pageSize, page * pageSize);

  res.json({
    code: 200,
    message: "success",
    data: {
      total,
      page,
      page_size: pageSize,
      total_page: Math.ceil(total / pageSize),
      order_list: list,
    },
  });
});

// 京东 - 订单详情查询
app.get(
  "/api/jd/order/:order_sn",
  verifySign("jd"),
  (req: Request, res: Response) => {
    const { order_sn } = req.params;
    const orders = dataCache["jd_orders"] || [];
    const order = orders.find((o: any) => o.order_sn === order_sn);

    if (!order) {
      return res.status(404).json({
        code: 40401,
        message: "订单不存在",
        data: null,
      });
    }

    res.json({
      code: 200,
      message: "success",
      data: order,
    });
  },
);

// 京东 - 客服对话列表
app.get("/api/jd/chats", verifySign("jd"), (req: Request, res: Response) => {
  const page = parseInt((req.query.page || "1") as string);
  const pageSize = parseInt((req.query.page_size || "20") as string);

  const chats = dataCache["jd_chats"] || [];
  const total = chats.length;
  const list = chats.slice((page - 1) * pageSize, page * pageSize);

  res.json({
    code: 200,
    message: "success",
    data: {
      total,
      page,
      page_size: pageSize,
      chat_list: list,
    },
  });
});

// ============================================================================
// 拼多多开放平台 API
// ============================================================================

// 拼多多 - 订单列表查询
app.post(
  "/api/pdd/orders/search",
  verifySign("pdd"),
  (req: Request, res: Response) => {
    const { page = 1, page_size = 20, order_status } = req.body;

    let orders = dataCache["pdd_orders"] || [];

    // 状态筛选
    if (order_status) {
      orders = orders.filter((o: any) => o.order_status === order_status);
    }

    const total = orders.length;
    const list = orders.slice((page - 1) * page_size, page * page_size);

    res.json({
      error_code: 0,
      error_msg: "success",
      result: {
        total_count: total,
        page,
        page_size,
        order_list: list,
      },
    });
  },
);

// 拼多多 - 订单详情查询
app.post(
  "/api/pdd/order/detail",
  verifySign("pdd"),
  (req: Request, res: Response) => {
    const { order_sn } = req.body;
    const orders = dataCache["pdd_orders"] || [];
    const order = orders.find((o: any) => o.order_sn === order_sn);

    if (!order) {
      return res.json({
        error_code: 40001,
        error_msg: "订单不存在",
        result: null,
      });
    }

    res.json({
      error_code: 0,
      error_msg: "success",
      result: order,
    });
  },
);

// 拼多多 - 客服对话列表
app.post(
  "/api/pdd/chats/list",
  verifySign("pdd"),
  (req: Request, res: Response) => {
    const { page = 1, page_size = 20 } = req.body;

    const chats = dataCache["pdd_chats"] || [];
    const total = chats.length;
    const list = chats.slice((page - 1) * page_size, page * page_size);

    res.json({
      error_code: 0,
      error_msg: "success",
      result: {
        total_count: total,
        page,
        page_size,
        chat_list: list,
      },
    });
  },
);

// ============================================================================
// 淘宝开放平台 API
// ============================================================================

// 淘宝 - 订单列表查询
app.get(
  "/api/taobao/trades/sold/get",
  verifySign("taobao"),
  (req: Request, res: Response) => {
    const page_no = parseInt((req.query.page_no || "1") as string);
    const page_size = parseInt((req.query.page_size || "20") as string);
    const status = req.query.status as string;

    let orders = dataCache["taobao_orders"] || [];

    // 状态筛选
    if (status) {
      orders = orders.filter((o: any) => o.status === status);
    }

    const total = orders.length;
    const list = orders.slice((page_no - 1) * page_size, page_no * page_size);

    res.json({
      trades_sold_get_response: {
        total_results: total,
        trades: {
          trade: list,
        },
      },
    });
  },
);

// 淘宝 - 订单详情查询
app.get(
  "/api/taobao/trade/fullinfo/get",
  verifySign("taobao"),
  (req: Request, res: Response) => {
    const { tid } = req.query;
    const orders = dataCache["taobao_orders"] || [];
    const order = orders.find((o: any) => o.tid === tid);

    if (!order) {
      return res.json({
        error_response: {
          code: 27,
          msg: "订单不存在",
          sub_code: "isv.trade-not-exist",
          sub_msg: "交易不存在",
        },
      });
    }

    res.json({
      trade_fullinfo_get_response: {
        trade: order,
      },
    });
  },
);

// 淘宝 - 客服对话列表
app.get(
  "/api/taobao/im/messages/get",
  verifySign("taobao"),
  (req: Request, res: Response) => {
    const page_no = parseInt((req.query.page_no || "1") as string);
    const page_size = parseInt((req.query.page_size || "20") as string);

    const chats = dataCache["taobao_chats"] || [];
    const total = chats.length;
    const list = chats.slice((page_no - 1) * page_size, page_no * page_size);

    res.json({
      im_messages_get_response: {
        total_results: total,
        messages: {
          message: list,
        },
      },
    });
  },
);

// ============================================================================
// 通用接口
// ============================================================================

// 健康检查
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    platforms: Object.keys(PLATFORM_CREDENTIALS),
  });
});

// API 文档
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "雷犀 AI 客服系统 - Mock API Server",
    version: "2.0.0",
    description: "模拟京东、拼多多、淘宝开放平台接口",
    platforms: {
      jd: {
        name: PLATFORM_CREDENTIALS.jd.name,
        app_key: PLATFORM_CREDENTIALS.jd.app_key,
        endpoints: [
          "GET /api/jd/orders - 订单列表",
          "GET /api/jd/order/:order_sn - 订单详情",
          "GET /api/jd/chats - 客服对话列表",
        ],
      },
      pdd: {
        name: PLATFORM_CREDENTIALS.pdd.name,
        app_key: PLATFORM_CREDENTIALS.pdd.app_key,
        endpoints: [
          "POST /api/pdd/orders/search - 订单列表",
          "POST /api/pdd/order/detail - 订单详情",
          "POST /api/pdd/chats/list - 客服对话列表",
        ],
      },
      taobao: {
        name: PLATFORM_CREDENTIALS.taobao.name,
        app_key: PLATFORM_CREDENTIALS.taobao.app_key,
        endpoints: [
          "GET /api/taobao/trades/sold/get - 订单列表",
          "GET /api/taobao/trade/fullinfo/get - 订单详情",
          "GET /api/taobao/im/messages/get - 客服对话列表",
        ],
      },
    },
    auth: {
      method: "MD5签名",
      params: ["app_key", "timestamp", "nonce", "sign"],
      algorithm: "MD5(app_key + timestamp + nonce + app_secret)",
      validity: "5分钟",
    },
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log("\n🚀 雷犀 Mock API Server 启动成功！");
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📖 API 文档: http://localhost:${PORT}/`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health\n`);
  console.log("🔐 平台凭证:");
  Object.entries(PLATFORM_CREDENTIALS).forEach(([key, value]) => {
    console.log(`   ${value.name}:`);
    console.log(`     app_key: ${value.app_key}`);
    console.log(`     app_secret: ${value.app_secret}\n`);
  });

  // 加载测试数据
  loadData();
});
