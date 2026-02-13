# 思流图（ThinkFlowMap）Dockerfile
# 优化版本 - 减小镜像体积

# 阶段1：构建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 设置npm镜像加速构建
RUN npm config set registry https://registry.npmmirror.com

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装依赖
RUN npm install --prefer-offline --no-audit

# 复制前端源代码并构建
COPY frontend/ ./
RUN npm run build

# 阶段2：Python后端（使用alpine减小体积）
FROM python:3.11-alpine

WORKDIR /app

# 安装必要的系统依赖（最小化）
RUN apk add --no-cache \
    gcc \
    musl-dev \
    && rm -rf /var/cache/apk/*

# 复制后端依赖
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && rm -rf /root/.cache/pip

# 复制后端代码
COPY backend/ ./backend/

# 复制前端构建产物到 /app/static/
COPY --from=frontend-builder /app/frontend/dist ./static/

# 设置环境变量
ENV PYTHONPATH=/app
ENV PORT=8080
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 暴露端口（Zeabur使用8080）
EXPOSE 8080

# 启动命令 - 直接运行main.py
CMD ["python", "backend/main.py"]
