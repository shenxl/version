#!/bin/bash
# 一键部署脚本 - 自动上传模板并部署Workers
# 使用方法: bash deploy.sh [options]
# 选项:
#   --no-deploy     只上传模板，不部署Worker
#   --no-upload     只部署Worker，不上传模板
#   --skip-install  跳过依赖安装
#   --local         只上传到本地KV (默认)
#   --remote        只上传到远程KV
#   --both          同时上传到本地和远程KV
#   --version       显示版本信息

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 恢复默认颜色

# 脚本版本
VERSION="1.0.0"

# 脚本路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 参数解析
DEPLOY_WORKER=true
UPLOAD_TEMPLATES=true
SKIP_INSTALL=false
UPLOAD_TARGET="local" # 默认为本地

for arg in "$@"; do
  case $arg in
    --no-deploy)
      DEPLOY_WORKER=false
      shift
      ;;
    --no-upload)
      UPLOAD_TEMPLATES=false
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=true
      shift
      ;;
    --local)
      UPLOAD_TARGET="local"
      shift
      ;;
    --remote)
      UPLOAD_TARGET="remote"
      shift
      ;;
    --both)
      UPLOAD_TARGET="both"
      shift
      ;;
    --version)
      echo -e "${BLUE}QuickConfig 一键部署脚本 v${VERSION}${NC}"
      exit 0
      ;;
    *)
      # 未知参数
      echo -e "${RED}错误: 未知参数 $arg${NC}"
      echo -e "使用方法: bash deploy.sh [options]"
      echo -e "选项:"
      echo -e "  --no-deploy     只上传模板，不部署Worker"
      echo -e "  --no-upload     只部署Worker，不上传模板"
      echo -e "  --skip-install  跳过依赖安装"
      echo -e "  --local         只上传到本地KV (默认)"
      echo -e "  --remote        只上传到远程KV"
      echo -e "  --both          同时上传到本地和远程KV"
      echo -e "  --version       显示版本信息"
      exit 1
      ;;
  esac
done

# 显示欢迎信息
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}     QuickConfig 一键部署脚本 v${VERSION}     ${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# 检查必要的工具
echo -e "${YELLOW}检查必要的工具...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 需要安装Node.js${NC}"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo -e "${RED}错误: 需要安装npx${NC}"
    exit 1
fi

# 检查Wrangler是否已安装
if ! npx wrangler --version &> /dev/null; then
    echo -e "${YELLOW}Wrangler未安装，正在安装...${NC}"
    npm install -g wrangler
fi

# 检查工作目录
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}错误: 没有找到wrangler.toml文件，请确保您在workers目录中运行此脚本${NC}"
    exit 1
fi

# 检查src/template目录
if [ ! -d "src/template" ]; then
    echo -e "${RED}错误: 未找到src/template目录${NC}"
    exit 1
fi

# 安装依赖
if [ "$SKIP_INSTALL" = false ]; then
    echo -e "${YELLOW}安装依赖...${NC}"
    # 使用npm install替代npm ci，更加通用
    npm install --no-fund --no-audit
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}警告: npm install失败，继续执行...${NC}"
    fi
else
    echo -e "${YELLOW}跳过依赖安装...${NC}"
fi

if [ "$DEPLOY_WORKER" = true ]; then
    # 部署Worker
    echo -e "${YELLOW}部署Worker到Cloudflare...${NC}"
    npx wrangler deploy
    if [ $? -ne 0 ]; then
        echo -e "${RED}Worker部署失败！${NC}"
        exit 1
    fi
    echo -e "${GREEN}Worker部署成功！${NC}"
fi

if [ "$UPLOAD_TEMPLATES" = true ]; then
    # 上传模板
    echo -e "${YELLOW}上传模板文件到KV存储 (${UPLOAD_TARGET})...${NC}"
    
    # 根据上传目标调用不同参数的上传脚本
    if [ "$UPLOAD_TARGET" = "local" ]; then
        node upload-templates.js --local
    elif [ "$UPLOAD_TARGET" = "remote" ]; then
        node upload-templates.js --remote
    elif [ "$UPLOAD_TARGET" = "both" ]; then
        node upload-templates.js --both
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}模板上传失败！${NC}"
        exit 1
    fi
    echo -e "${GREEN}模板上传成功！${NC}"
fi

echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}                 部署完成！                 ${NC}"
echo -e "${GREEN}=====================================================${NC}"

# 获取当前Worker的URL
WORKER_URL=$(grep -o 'name\s*=\s*"[^"]*"' wrangler.toml | head -1 | cut -d'"' -f2)
echo -e "Worker URL: ${BLUE}https://${WORKER_URL}.workers.dev${NC}"
echo -e "API版本: ${BLUE}$(grep -o 'CURRENT_VERSION\s*=\s*"[^"]*"' wrangler.toml | cut -d'"' -f2)${NC}"
echo ""
echo -e "您可以访问以下URL测试您的API:"
echo -e "- 版本信息: ${BLUE}https://${WORKER_URL}.workers.dev/api/version${NC}"
echo -e "- 模板示例: ${BLUE}https://${WORKER_URL}.workers.dev/template/1.0.0/basic/navigation_template.json${NC}" 