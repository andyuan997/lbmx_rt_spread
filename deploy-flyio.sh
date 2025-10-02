#!/bin/bash

# Fly.io 部署腳本
# 使用方法: ./deploy-flyio.sh

set -e

echo "🚀 開始部署到 Fly.io..."

# 檢查是否安裝了 flyctl
if ! command -v fly &> /dev/null; then
    echo "❌ 請先安裝 flyctl: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# 檢查是否已登入
if ! fly auth whoami &> /dev/null; then
    echo "🔐 請先登入 Fly.io:"
    fly auth login
fi

# 構建前端
echo "📦 構建前端..."
cd frontend
npm ci
npm run build
cd ..

# 檢查 fly.toml 是否存在
if [ ! -f "fly.toml" ]; then
    echo "❌ fly.toml 文件不存在"
    exit 1
fi

# 部署到 Fly.io
echo "🚀 部署到 Fly.io..."
fly deploy

echo "✅ 部署完成！"
echo "🌐 應用地址: https://$(fly info --json | jq -r '.Hostname')"
echo ""
echo "📋 常用命令:"
echo "  fly status          # 查看應用狀態"
echo "  fly logs            # 查看日誌"
echo "  fly scale count 1   # 設置實例數量"
echo "  fly open            # 在瀏覽器中打開應用"
