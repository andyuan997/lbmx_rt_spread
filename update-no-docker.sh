#!/bin/bash

# LBMX 即時價差監控系統 - 更新腳本（無 Docker）

set -e

echo "=================================================="
echo "🔄 更新 LBMX 即時價差監控系統"
echo "=================================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOY_DIR=$(pwd)

# 步驟 1: 拉取最新代碼
echo -e "\n${YELLOW}步驟 1/5: 拉取最新代碼...${NC}"
git pull
echo -e "${GREEN}✓ 代碼更新完成${NC}"

# 步驟 2: 更新後端依賴
echo -e "\n${YELLOW}步驟 2/5: 更新後端依賴...${NC}"
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
echo -e "${GREEN}✓ 後端依賴更新完成${NC}"

# 步驟 3: 重新構建前端
echo -e "\n${YELLOW}步驟 3/5: 重新構建前端...${NC}"
cd frontend
npm install
npm run build
cd ..
echo -e "${GREEN}✓ 前端構建完成${NC}"

# 步驟 4: 重啟後端服務
echo -e "\n${YELLOW}步驟 4/5: 重啟後端服務...${NC}"
sudo systemctl restart lbmx-backend
sleep 3
echo -e "${GREEN}✓ 後端服務已重啟${NC}"

# 步驟 5: 重啟 Nginx
echo -e "\n${YELLOW}步驟 5/5: 重啟 Nginx...${NC}"
sudo systemctl restart nginx
echo -e "${GREEN}✓ Nginx 已重啟${NC}"

# 檢查服務狀態
echo -e "\n${GREEN}服務狀態:${NC}"
sudo systemctl status lbmx-backend --no-pager | head -10

echo -e "\n=================================================="
echo -e "${GREEN}🎉 更新完成！${NC}"
echo -e "=================================================="

