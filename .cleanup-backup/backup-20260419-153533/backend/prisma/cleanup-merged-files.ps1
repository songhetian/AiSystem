# 数据库文件清理脚本 (PowerShell)
# 用途: 删除已合并到seed.ts的独立文件

Write-Host "🧹 开始清理已合并的数据库文件..." -ForegroundColor Cyan

# 检查并删除 seed-quality-prompt-menus.ts
$seedFile = "prisma/seed-quality-prompt-menus.ts"
if (Test-Path $seedFile) {
    Write-Host "✅ 找到 seed-quality-prompt-menus.ts" -ForegroundColor Green
    Remove-Item $seedFile -Force
    Write-Host "🗑️  已删除 seed-quality-prompt-menus.ts" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  seed-quality-prompt-menus.ts 不存在" -ForegroundColor DarkYellow
}

# 检查并删除 add-quality-prompt-menus.sql
$sqlFile = "prisma/migrations/add-quality-prompt-menus.sql"
if (Test-Path $sqlFile) {
    Write-Host "✅ 找到 add-quality-prompt-menus.sql" -ForegroundColor Green
    Remove-Item $sqlFile -Force
    Write-Host "🗑️  已删除 add-quality-prompt-menus.sql" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  add-quality-prompt-menus.sql 不存在" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "✨ 清理完成!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 说明:" -ForegroundColor Cyan
Write-Host "  - seed-quality-prompt-menus.ts 已合并到 seed.ts"
Write-Host "  - add-quality-prompt-menus.sql 已合并到 seed.ts"
Write-Host "  - migrations/ 目录保持完整(Prisma需要)"
Write-Host ""
Write-Host "🚀 下一步:" -ForegroundColor Cyan
Write-Host "  运行 'npx prisma migrate reset' 重新初始化数据库"
