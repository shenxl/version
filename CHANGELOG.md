# Changelog

## [1.1.0] - 2024-06-xx

### 新增
- **本地一键部署脚本**：添加`deploy.sh`和`deploy.bat`脚本，支持一键部署Worker和上传模板
- **灵活部署选项**：支持仅部署Worker、仅上传模板或同时执行两者
- **批量模板管理**：新增批量模板文件上传和更新功能

### 优化
- 模板上传脚本简化，提高可靠性和易用性
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