/**
 * 将模板文件上传到Cloudflare KV的脚本
 * 使用方法: node upload-templates.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 模板目录
const TEMPLATE_DIR = path.join(__dirname, 'src', 'template');

/**
 * 上传单个文件到KV
 */
function uploadFileToKV(filePath, kvKey) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const command = `npx wrangler kv key put --remote --binding=TEMPLATES_KV "${kvKey}" '${content.replace(/'/g, "\\'")}'`;
    
    console.log(`上传: ${filePath} -> ${kvKey}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`上传失败 ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * 递归处理目录中的文件
 */
function processDirectory(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    // 跳过隐藏文件
    if (entry.name.startsWith('.')) continue;
    
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // 递归处理子目录
      processDirectory(fullPath, path.join(basePath, entry.name));
    } else if (entry.isFile()) {
      // 处理文件
      const relativePath = path.join(basePath, entry.name);
      uploadFileToKV(fullPath, relativePath);
    }
  }
}

/**
 * 主函数
 */
function main() {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error(`模板目录不存在: ${TEMPLATE_DIR}`);
    process.exit(1);
  }
  
  // 检查是否配置了KV
  try {
    const wranglerConfig = fs.readFileSync(path.join(__dirname, 'wrangler.toml'), 'utf-8');
    
    if (!wranglerConfig.includes('TEMPLATES_KV') || wranglerConfig.includes('YOUR_KV_NAMESPACE_ID')) {
      console.error('请先在wrangler.toml中配置正确的KV命名空间ID');
      console.error('运行 `npx wrangler kv namespace create TEMPLATES_KV` 创建KV命名空间');
      console.error('然后将生成的ID填入wrangler.toml文件');
      process.exit(1);
    }
  } catch (error) {
    console.error('读取wrangler.toml失败:', error.message);
    process.exit(1);
  }
  
  console.log('开始上传模板文件到Cloudflare KV...');
  
  // 处理模板目录
  processDirectory(TEMPLATE_DIR);
  
  console.log('模板文件上传完成！');
}

// 执行主函数
main(); 