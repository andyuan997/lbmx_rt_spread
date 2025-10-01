#!/bin/bash

# LBMX 即時價差監控系統 - 更新腳本

set -e

echo "=================================================="
echo "🔄 更新 LBMX 即時價差監控系統"
echo "=================================================="

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 步驟 1: 拉取最新代碼
echo -e "\n${YELLOW}步驟 1/4: 拉取最新代碼...${NC}"
git pull
echo -e "${GREEN}✓ 代碼更新完成${NC}"

# 步驟 2: 停止舊服務
echo -e "\n${YELLOW}步驟 2/4: 停止舊服務...${NC}"
docker-compose down
echo -e "${GREEN}✓ 舊服務已停止${NC}"

# 步驟 3: 重新構建並啟動
echo -e "\n${YELLOW}步驟 3/4: 重新構建並啟動服務...${NC}"
docker-compose up -d --build
echo -e "${GREEN}✓ 服務已啟動${NC}"

# 等待服務啟動
echo "等待服務啟動..."
sleep 10

# 步驟 4: 驗證服務
echo -e "\n${YELLOW}步驟 4/4: 驗證服務...${NC}"

# 檢查後端健康狀態
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:8001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 後端服務正常${NC}"
        break
    fi
    attempt=$((attempt+1))
    echo "等待後端啟動... ($attempt/$max_attempts)"
    sleep 2
done

# 顯示容器狀態
echo -e "\n${GREEN}容器狀態:${NC}"
docker-compose ps

# 清理舊鏡像
echo -e "\n${YELLOW}是否清理舊的Docker鏡像？(y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    docker image prune -f
    echo -e "${GREEN}✓ 清理完成${NC}"
fi

echo -e "\n=================================================="
echo -e "${GREEN}🎉 更新完成！${NC}"
echo -e "=================================================="

