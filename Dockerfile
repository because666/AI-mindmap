# 思流图（ThinkFlowMap）Dockerfile
# 使用多阶段构建

# 阶段1：构建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 设置npm镜像加速构建
RUN npm config set registry https://registry.npmmirror.com

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装依赖（使用npm install代替npm ci以处理可能的版本差异）
RUN npm install

# 复制前端源代码并构建
COPY frontend/ ./
RUN npm run build

# 阶段2：Python后端
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 复制后端依赖
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./backend/

# 复制前端构建产物到 /app/static/
COPY --from=frontend-builder /app/frontend/dist ./static/

# 设置环境变量
ENV PYTHONPATH=/app
ENV PORT=8080

# 暴露端口（Zeabur使用8080）
EXPOSE 8080

# 启动命令 - 使用uvicorn启动，确保正确处理静态文件
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
