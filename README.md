# KDocs API 转发服务 (v0.9.8)

这是一个基于Cloudflare Worker的API转发服务，用于将请求安全地转发到金山文档KDocs API。

## 功能

- 转发API请求到KDocs
- 自动携带必要的认证头部
- 跨域支持 (CORS)
- 错误处理与日志
- 完整的单元测试和集成测试
- 模板文件访问API

## 本地开发

```bash
# 安装依赖
npm install

# 本地运行
npm run dev

# 运行测试
npm test

# 运行测试并监视文件变化
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

## 部署

```bash
# 部署到GitHub和Cloudflare
npm run deploy
```

## API端点

### 模板文件访问

**请求**:
```
GET /template/{typeFolder}/{fileName}
```

**路径参数**:
- `typeFolder`: 模板类型，可以是 `basic`（基教）或 `higher`（高校）
- `fileName`: 模板文件名，例如 `navigation_template.json` 或 `apps_temp.csv`

**返回**:
- 对于JSON文件：返回 `application/json` 类型的响应
- 对于CSV文件：返回 `text/csv` 类型的响应

**示例**:
```bash
# 获取基教导航模板
curl "https://api.shenxl.com/template/basic/navigation_template.json"

# 获取高校应用模板 (CSV格式)
curl "https://api.shenxl.com/template/higher/apps_temp.csv"
```

### 获取模板版本信息

**请求**:
```
GET /v1/template/version
```

**返回**:
```json
{
  "version": "1.0.0",
  "released": "2024-4-21",
  "updateMessage": "初始版本模板发布"
}
```

### 同步任务状态

**请求**:
```
POST /v1/wo/file/{fileId}/script/{taskId}/sync_task
```

**请求体**:
```json
{
  "Context": {
    "argv": {
      "name": "金山智慧校园-基教",
      "user": "沈霄雷",
      "version": "0.9.8",
      "status": "执行成功",
      "method": "自动提交",
      "note": "所有任务成功完成。 共 6 个任务。成功: 6, 失败: 0."
    }
  }
}
```

**示例**:
```bash
curl -X POST "https://your-worker.example.workers.dev/v1/wo/file/abc123/script/task456/sync_task" \
  -H "Content-Type: application/json" \
  -d '{"Context":{"argv":{"name":"金山智慧校园-基教","user":"沈霄雷","version":"0.9.8","status":"执行成功","method":"自动提交","note":"所有任务成功完成。 共 6 个任务。成功: 6, 失败: 0."}}}'
```

## 测试

项目包含完整的测试套件，确保API的稳定性和可靠性：

### 单元测试
- `handleRequest.test.js`: 测试请求处理逻辑
- `forwardToKDocsAPI.test.js`: 测试API转发功能

### 集成测试
- `api.test.js`: 测试完整API请求流程

### 测试覆盖率要求
- 行覆盖率: > 90%
- 分支覆盖率: > 85%
- 函数覆盖率: 100%

每次部署前会自动运行测试，确保代码质量。

## Cloudflare Pages 配置

在Cloudflare Pages上配置自动部署：

1. **名称**: `kdocs-api-worker`
2. **分支**: `main`
3. **构建命令**: `npm install && npm test`
4. **部署命令**: `npx wrangler deploy`
5. **根目录**: `/workers`

### 环境变量

在Cloudflare Pages的环境变量中设置:
- **AirScript_Token**: "771DFCwiaEbNjBriQtAHWF" 