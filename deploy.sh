#!/usr/bin/env bash
# 简单一键部署脚本：本地构建 + 上传到阿里云服务器
# 适用：Vite + React 前端项目

set -e  # 过程中有任何错误就退出

############################
# 配置区：按需修改
############################

# 本地项目根目录（默认：脚本所在目录）
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 服务器信息
SERVER_USER="root"                 # 如果不是 root，就改成你的用户名
SERVER_HOST="120.26.118.242"      # 你的阿里云公网 IP

# 服务器上存放前端静态文件的目录
REMOTE_DIR="/var/www/html/CC1310_WEB"

# 对应 Vite 配置中的 base（建议设成 /CC1310_WEB/）
APP_URL="http://${SERVER_HOST}/CC1310_WEB/"

############################
# 开始构建
############################

echo "==> 切换到项目目录: ${PROJECT_DIR}"
cd "${PROJECT_DIR}"

echo "==> 安装依赖（如已安装会很快）..."
npm install

echo "==> 构建前端（npm run build）..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ 构建失败：未找到 dist 目录"
  exit 1
fi

############################
# 上传到服务器
############################

echo "==> 在服务器上创建目标目录: ${REMOTE_DIR}"
ssh "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${REMOTE_DIR}'"

echo "==> 使用 rsync 同步 dist 到服务器..."
rsync -avz --delete ./dist/ "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/"

echo "✅ 部署完成！现在可以访问：${APP_URL}"

ssh "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${REMOTE_DIR}/data'"
ssh "${SERVER_USER}@${SERVER_HOST}" "ln -sf '/home/wwq/cc1310_logger/data/latest_nodes.csv' '${REMOTE_DIR}/data/latest_nodes.csv'"
