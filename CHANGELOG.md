# Changelog

## [1.1.0] - 2024-06-xx

### 新增
- **CI/CD自动部署流程**：通过GitHub Actions自动部署Worker和上传模板
- **模板自动同步**：当新代码推送到主分支时，自动将模板文件同步到KV存储
- **批量模板管理**：新增批量模板文件上传和更新功能

### 优化
- 模板上传脚本支持CI/CD环境，添加环境变量认证支持
- 版本管理流程优化，支持一年长效缓存
- 错误报告增强，改进日志输出以便于调试

## [1.0.0] - 2024-06-xx

### 新增
- 模板文件直接访问API，支持路径格式：`/template/{version}/{typeFolder}/{fileName}`
- 支持JSON和CSV格式模板文件的访问
- 模板文件API的单元测试

### 优化
- README文档更新，增加模板API使用说明
- 模板访问性能优化，添加缓存控制

## [0.9.8] - 2024-04-21

### 新增
- API转发服务，使用Cloudflare Workers
- KDocs API的转发功能
- 同步任务API (`/v1/wo/file/{fileId}/script/{taskId}/sync_task`)
- 完整的错误处理
- CORS支持
- 测试框架集成 