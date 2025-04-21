# Node.js RESTful API Cloudflare Worker

这是一个基于Node.js的Cloudflare Worker项目，提供RESTful API接口。

## 本地开发

```bash
# 安装依赖
npm install

# 本地运行
npm run dev
```

## 部署

```bash
# 部署到Cloudflare （测试）
npm run deploy
```

## GitHub集成

本项目可以通过Cloudflare Dashboard中的设置与GitHub仓库关联，实现自动部署：

1. 登录Cloudflare Dashboard
2. 进入Workers & Pages板块
3. 创建新应用并选择"连接到Git"
4. 选择包含此项目的GitHub仓库
5. 设置构建命令和输出目录
6. 完成创建，推送代码到GitHub将自动触发部署

## API端点

| 方法   | 路径         | 描述           |
|--------|--------------|----------------|
| GET    | /            | 欢迎信息       |
| GET    | /items       | 获取所有项目   |
| GET    | /items/:id   | 获取单个项目   |
| POST   | /items       | 创建新项目     |
| PUT    | /items/:id   | 更新项目       |
| DELETE | /items/:id   | 删除项目       |

## 请求示例

### 创建项目
```bash
curl -X POST http://localhost:8787/items \
  -H "Content-Type: application/json" \
  -d '{"name":"测试项目","description":"这是一个测试项目","price":99.99,"tax":10}'
```

### 获取所有项目
```bash
curl http://localhost:8787/items
```

### 获取单个项目
```bash
curl http://localhost:8787/items/[项目ID]
```

### 更新项目
```bash
curl -X PUT http://localhost:8787/items/[项目ID] \
  -H "Content-Type: application/json" \
  -d '{"name":"更新的项目名称","price":199.99}'
```

### 删除项目
```bash
curl -X DELETE http://localhost:8787/items/[项目ID]
``` 