# 多階段構建 - 構建階段
FROM node:18-alpine as build

WORKDIR /app

# 複製package文件
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製源代碼
COPY . .

# 構建應用
RUN npm run build

# 生產階段
FROM nginx:alpine

# 複製構建結果到nginx
COPY --from=build /app/build /usr/share/nginx/html

# 複製nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 啟動nginx
CMD ["nginx", "-g", "daemon off;"]
