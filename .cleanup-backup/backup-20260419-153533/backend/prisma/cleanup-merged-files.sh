#!/bin/bash

# 数据库文件清理脚本
# 用途: 删除已合并到seed.ts的独立文件

echo "🧹 开始清理已合并的数据库文件..."

# 检查文件是否存在
if [ -f "prisma/seed-quality-prompt-menus.ts" ]; then
    echo "✅ 找到 seed-quality-prompt-menus.ts"
    rm prisma/seed-quality-prompt-menus.ts
    echo "🗑️  已删除 seed-quality-prompt-menus.ts"
else
    echo "⚠️  seed-quality-prompt-menus.ts 不存在"
fi

if [ -f "prisma/migrations/add-quality-prompt-menus.sql" ]; then
    echo "✅ 找到 add-quality-prompt-menus.sql"
    rm prisma/migrations/add-quality-prompt-menus.sql
    echo "🗑️  已删除 add-quality-prompt-menus.sql"
else
    echo "⚠️  add-quality-prompt-menus.sql 不存在"
fi

echo ""
echo "✨ 清理完成!"
echo ""
echo "📝 说明:"
echo "  - seed-quality-prompt-menus.ts 已合并到 seed.ts"
echo "  - add-quality-prompt-menus.sql 已合并到 seed.ts"
echo "  - migrations/ 目录保持完整(Prisma需要)"
echo ""
echo "🚀 下一步:"
echo "  运行 'npx prisma migrate reset' 重新初始化数据库"
