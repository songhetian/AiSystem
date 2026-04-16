#!/bin/bash

# 测试 Mock API Server 的签名验证和接口调用

echo "🧪 测试 Mock API Server"
echo "======================="
echo ""

# 京东平台测试
echo "📦 测试京东平台 API"
echo "-------------------"

app_key="jd_leixin_2026"
app_secret="jd_secret_8899"
timestamp=$(date +%s)
nonce=$(openssl rand -hex 4)

# 计算签名：MD5(app_key + timestamp + nonce + app_secret)
sign=$(echo -n "${app_key}${timestamp}${nonce}${app_secret}" | md5)

echo "签名参数："
echo "  app_key: $app_key"
echo "  timestamp: $timestamp"
echo "  nonce: $nonce"
echo "  sign: $sign"
echo ""

# 测试订单列表接口
echo "1. 测试订单列表接口（GET /api/jd/orders）"
curl -s "http://localhost:3888/api/jd/orders?app_key=${app_key}&timestamp=${timestamp}&nonce=${nonce}&sign=${sign}&page=1&page_size=5" | jq '.'
echo ""

# 测试客服对话列表接口
echo "2. 测试客服对话列表接口（GET /api/jd/chats）"
curl -s "http://localhost:3888/api/jd/chats?app_key=${app_key}&timestamp=${timestamp}&nonce=${nonce}&sign=${sign}&page=1&page_size=3" | jq '.'
echo ""

# 拼多多平台测试
echo "📦 测试拼多多平台 API"
echo "-------------------"

app_key="pdd_leixin_2026"
app_secret="pdd_secret_7788"
timestamp=$(date +%s)
nonce=$(openssl rand -hex 4)
sign=$(echo -n "${app_key}${timestamp}${nonce}${app_secret}" | md5)

echo "签名参数："
echo "  app_key: $app_key"
echo "  timestamp: $timestamp"
echo "  nonce: $nonce"
echo "  sign: $sign"
echo ""

# 测试订单列表接口
echo "1. 测试订单列表接口（POST /api/pdd/orders/search）"
curl -s -X POST "http://localhost:3888/api/pdd/orders/search?app_key=${app_key}&timestamp=${timestamp}&nonce=${nonce}&sign=${sign}" \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "page_size": 5}' | jq '.'
echo ""

# 淘宝平台测试
echo "📦 测试淘宝平台 API"
echo "-------------------"

app_key="tb_leixin_2026"
app_secret="tb_secret_6677"
timestamp=$(date +%s)
nonce=$(openssl rand -hex 4)
sign=$(echo -n "${app_key}${timestamp}${nonce}${app_secret}" | md5)

echo "签名参数："
echo "  app_key: $app_key"
echo "  timestamp: $timestamp"
echo "  nonce: $nonce"
echo "  sign: $sign"
echo ""

# 测试订单列表接口
echo "1. 测试订单列表接口（GET /api/taobao/trades/sold/get）"
curl -s "http://localhost:3888/api/taobao/trades/sold/get?app_key=${app_key}&timestamp=${timestamp}&nonce=${nonce}&sign=${sign}&page_no=1&page_size=5" | jq '.'
echo ""

echo "✅ 测试完成！"
