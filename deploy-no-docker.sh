#!/bin/bash

# LBMX 即時價差監控系統 - 無 Docker 部署腳本
# 適用於低內存 Ubuntu 伺服器

set -e

echo "=================================================="
echo "🚀 LBMX 即時價差監控系統 - 輕量級部署"
echo "=================================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 獲取當前目錄
DEPLOY_DIR=$(pwd)

echo -e "\n${GREEN}部署目錄: $DEPLOY_DIR${NC}"

# 步驟 1: 更新系統並安裝依賴
echo -e "\n${YELLOW}步驟 1/6: 安裝系統依賴...${NC}"
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx curl

echo -e "${GREEN}✓ 系統依賴安裝完成${NC}"

# 步驟 2: 安裝 Node.js
echo -e "\n${YELLOW}步驟 2/6: 安裝 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "安裝 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✓ Node.js 安裝完成${NC}"
else
    echo -e "${GREEN}✓ Node.js 已安裝${NC}"
fi

node --version
npm --version

# 步驟 3: 設置後端
echo -e "\n${YELLOW}步驟 3/6: 配置後端服務...${NC}"

# 創建虛擬環境
echo "創建 Python 虛擬環境..."
python3 -m venv venv

# 激活虛擬環境並安裝依賴
echo "安裝 Python 依賴..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

echo -e "${GREEN}✓ 後端配置完成${NC}"

# 步驟 4: 構建前端
echo -e "\n${YELLOW}步驟 4/6: 構建前端...${NC}"

cd frontend

# 安裝前端依賴
echo "安裝前端依賴..."
npm install

# 構建生產版本
echo "構建生產版本..."
npm run build

cd ..

echo -e "${GREEN}✓ 前端構建完成${NC}"

# 步驟 5: 配置 Nginx
echo -e "\n${YELLOW}步驟 5/6: 配置 Nginx...${NC}"

# 創建 Nginx 配置
sudo tee /etc/nginx/sites-available/lbmx > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # 前端靜態文件
    location / {
        root $DEPLOY_DIR/frontend/build;
        try_files \$uri \$uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket 代理
    location /ws {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
EOF

# 啟用站點
sudo ln -sf /etc/nginx/sites-available/lbmx /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 測試 Nginx 配置
sudo nginx -t

# 重啟 Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

echo -e "${GREEN}✓ Nginx 配置完成${NC}"

# 步驟 6: 創建 systemd 服務
echo -e "\n${YELLOW}步驟 6/6: 創建系統服務...${NC}"

# 創建後端服務
sudo tee /etc/systemd/system/lbmx-backend.service > /dev/null <<EOF
[Unit]
Description=LBMX Backend Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DEPLOY_DIR
Environment="PATH=$DEPLOY_DIR/venv/bin"
Environment="PYTHONPATH=$DEPLOY_DIR"
ExecStart=$DEPLOY_DIR/venv/bin/python $DEPLOY_DIR/run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 重新加載 systemd
sudo systemctl daemon-reload

# 啟動服務
sudo systemctl start lbmx-backend
sudo systemctl enable lbmx-backend

# 等待服務啟動
echo "等待服務啟動..."
sleep 5

# 檢查服務狀態
echo -e "\n${GREEN}服務狀態:${NC}"
sudo systemctl status lbmx-backend --no-pager | head -10

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
echo -e "\n${GREEN}管理命令:${NC}"
echo -e "  查看日誌: ${YELLOW}sudo journalctl -u lbmx-backend -f${NC}"
echo -e "  重啟服務: ${YELLOW}sudo systemctl restart lbmx-backend${NC}"
echo -e "  停止服務: ${YELLOW}sudo systemctl stop lbmx-backend${NC}"
echo -e "  查看狀態: ${YELLOW}sudo systemctl status lbmx-backend${NC}"
echo -e "\n${GREEN}Nginx 管理:${NC}"
echo -e "  重啟:     ${YELLOW}sudo systemctl restart nginx${NC}"
echo -e "  查看日誌: ${YELLOW}sudo tail -f /var/log/nginx/error.log${NC}"
echo -e "\n=================================================="

echo -e "\n${YELLOW}是否查看實時日誌？(y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    sudo journalctl -u lbmx-backend -f
fi

