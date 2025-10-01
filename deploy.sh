#!/bin/bash

# LBMX 即時價差監控系統 - 快速部署腳本
# 適用於 Ubuntu 20.04+

set -e

echo "=================================================="
echo "🚀 LBMX 即時價差監控系統 - 自動部署"
echo "=================================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查是否為 root 或有 sudo 權限
if [ "$EUID" -ne 0 ] && ! sudo -v; then
  echo -e "${RED}錯誤: 需要 root 權限或 sudo 權限${NC}"
  exit 1
fi

# 步驟 1: 檢查並安裝 Docker
echo -e "\n${YELLOW}步驟 1/5: 檢查 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Docker 未安裝，正在安裝..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker 安裝完成${NC}"
else
    echo -e "${GREEN}✓ Docker 已安裝${NC}"
fi

# 步驟 2: 檢查並安裝 Docker Compose
echo -e "\n${YELLOW}步驟 2/5: 檢查 Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose 未安裝，正在安裝..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose 安裝完成${NC}"
else
    echo -e "${GREEN}✓ Docker Compose 已安裝${NC}"
fi

# 顯示版本信息
echo -e "\n${GREEN}Docker 版本:${NC}"
docker --version
echo -e "${GREEN}Docker Compose 版本:${NC}"
docker-compose --version

# 步驟 3: 停止舊容器（如果存在）
echo -e "\n${YELLOW}步驟 3/5: 停止舊容器...${NC}"
if [ -f "docker-compose.yml" ]; then
    docker-compose down || true
    echo -e "${GREEN}✓ 舊容器已停止${NC}"
else
    echo "沒有發現舊部署"
fi

# 步驟 4: 構建並啟動容器
echo -e "\n${YELLOW}步驟 4/5: 構建並啟動服務...${NC}"
docker-compose up -d --build

# 等待服務啟動
echo "等待服務啟動..."
sleep 10

# 步驟 5: 驗證部署
echo -e "\n${YELLOW}步驟 5/5: 驗證部署...${NC}"

# 檢查容器狀態
echo -e "\n${GREEN}容器狀態:${NC}"
docker-compose ps

# 檢查後端健康狀態
echo -e "\n${GREEN}檢查後端健康狀態...${NC}"
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

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}✗ 後端服務啟動超時${NC}"
    echo "請檢查日誌: docker-compose logs backend"
    exit 1
fi

# 檢查前端
echo -e "\n${GREEN}檢查前端服務...${NC}"
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 前端服務正常${NC}"
else
    echo -e "${YELLOW}! 前端服務可能需要更多時間啟動${NC}"
fi

# 獲取伺服器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# 部署完成
echo -e "\n=================================================="
echo -e "${GREEN}🎉 部署成功！${NC}"
echo -e "=================================================="
echo -e "\n${GREEN}訪問地址:${NC}"
echo -e "  前端界面: ${YELLOW}http://$SERVER_IP${NC}"
echo -e "  或者:     ${YELLOW}http://localhost${NC}"
echo -e "\n${GREEN}API 文檔:${NC}"
echo -e "  Swagger:  ${YELLOW}http://$SERVER_IP/api/docs${NC}"
echo -e "\n${GREEN}健康檢查:${NC}"
echo -e "  後端:     ${YELLOW}http://$SERVER_IP/api/health${NC}"
echo -e "\n${GREEN}常用命令:${NC}"
echo -e "  查看日誌: ${YELLOW}docker-compose logs -f${NC}"
echo -e "  重啟服務: ${YELLOW}docker-compose restart${NC}"
echo -e "  停止服務: ${YELLOW}docker-compose down${NC}"
echo -e "  查看狀態: ${YELLOW}docker-compose ps${NC}"
echo -e "\n=================================================="

# 詢問是否查看日誌
echo -e "\n${YELLOW}是否查看實時日誌？(y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    docker-compose logs -f
fi
