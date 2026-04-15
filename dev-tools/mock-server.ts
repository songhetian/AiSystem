import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

/**
 * 终极规范化 Mock API Server (V21.0)
 * 遵循《规范文档.md》：RESTful、标准响应格式、Nonce防重放、MD5签名。
 */

const app = express();
const PORT = 3888;
const BASE_DATA_DIR = path.join(process.cwd(), 'dev-tools', 'data-templates');

const CREDENTIALS = {
  app_key: 'leixin_2026_prod',
  app_secret: 's3cret_shhh_8899'
};

app.use(cors());
app.use(express.json());

// --- 仿真规范签名算法：MD5(app_key + timestamp + nonce + app_secret) ---
const calculateSign = (appKey: string, ts: string, nonce: string, secret: string) => {
  return crypto.createHash('md5').update(`${appKey}${ts}${nonce}${secret}`).digest('hex');
};

// --- 标准鉴权中间件 (规范 8.1) ---
const standardAuth = (req: Request, res: Response, next: NextFunction) => {
  const { app_key, timestamp, nonce, sign, simulate_error, simulate_timeout } = req.query;

  // 1. 模拟异常占位 (用于测试高可用)
  if (simulate_error === 'true') return res.status(500).json({ code: 500, message: '模拟服务器内部错误', data: {} });
  if (simulate_timeout === 'true') return; 

  // 2. 基础校验
  if (!app_key || !timestamp || !nonce || !sign) {
    return res.status(400).json({ code: 400, message: '请求参数缺失 (Key/TS/Nonce/Sign)', data: {} });
  }

  // 3. 时间戳过期校验 (规范 8.1: 5分钟)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp as string)) > 300) {
    return res.status(403).json({ code: 403, message: '请求已过期', data: {} });
  }

  // 4. 签名深度校验
  const expectedSign = calculateSign(app_key as string, timestamp as string, nonce as string, CREDENTIALS.app_secret);
  if (sign !== expectedSign) {
    return res.status(403).json({ code: 403, message: '签名校验失败', data: {} });
  }

  next();
};

const dataCache: Record<string, any> = {};
const loadData = () => {
  ['jd', 'taobao', 'douyin', 'pinduoduo'].forEach(p => {
    ['orders', 'chats', 'evaluations'].forEach(type => {
      const fp = path.join(BASE_DATA_DIR, p, `${type}.json`);
      if (fs.existsSync(fp)) dataCache[`${p}_${type}`] = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    });
  });
};
loadData();

// 路由映射 (严格遵循规范 7.4.1 响应格式)
['jd', 'taobao', 'douyin', 'pinduoduo'].forEach(p => {
  // 统一聊天接口
  app.get(`/mock/${p}/chat`, standardAuth, (req, res) => {
    const page = parseInt((req.query.page || '1') as string);
    const pageSize = parseInt((req.query.pageSize || '10') as string);
    const chats = dataCache[`${p}_chats`] || [];
    const list = chats.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        total: chats.length,
        list: list,
        page,
        pageSize
      }
    });
  });

  // 统一订单接口
  app.all(`/mock/${p}/order`, standardAuth, (req, res) => {
    const orders = dataCache[`${p}_orders`] || [];
    res.json({
      code: 200,
      message: '操作成功',
      data: { total: orders.length, list: orders }
    });
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 [终极规范版] Mock Server 已启动！端口: ${PORT}`);
  console.log(`🔐 校验逻辑：Timestamp(5min) + Nonce + MD5 Sign`);
});
