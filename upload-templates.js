/**
 * 将模板文件上传到Cloudflare KV的脚本
 * 使用方法: node upload-templates.js
 * 
 * CI/CD环境中设置以下环境变量:
 * - CF_API_TOKEN: Cloudflare API令牌
 * - CF_ACCOUNT_ID: Cloudflare账户ID
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// 模板目录
const TEMPLATE_DIR = path.join(__dirname, 'src', 'template');

// 从环境变量或wrangler.toml获取KV命名空间ID
let KV_NAMESPACE_ID = null;

/**
 * 上传单个文件到KV
 */
function uploadFileToKV(filePath, kvKey) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 构建命令，根据环境添加相应的认证参数
    let command = `npx wrangler kv key put --binding=TEMPLATES_KV "${kvKey}" '${content.replace(/'/g, "\\'")}'`;
    
    // 如果在CI/CD环境中，使用环境变量中的Token和AccountID
    if (process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID) {
      command = `npx wrangler kv key put --binding=TEMPLATES_KV "${kvKey}" '${content.replace(/'/g, "\\'")}' --account-id=${process.env.CF_ACCOUNT_ID}`;
    }
    
    console.log(`上传: ${filePath} -> ${kvKey}`);
    execSync(command, { 
      stdio: 'inherit',
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN
      }
    });
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
 * 从wrangler.toml文件中提取KV命名空间ID
 */
function extractKVNamespaceId() {
  try {
    const wranglerConfig = fs.readFileSync(path.join(__dirname, 'wrangler.toml'), 'utf-8');
    const kvMatch = wranglerConfig.match(/binding\s*=\s*["']TEMPLATES_KV["']\s*\nid\s*=\s*["']([^"']+)["']/);
    
    if (kvMatch && kvMatch[1]) {
      return kvMatch[1];
    }
    return null;
  } catch (error) {
    console.error('读取wrangler.toml失败:', error.message);
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error(`模板目录不存在: ${TEMPLATE_DIR}`);
    process.exit(1);
  }
  
  // 检查是否在CI/CD环境中运行
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  console.log(`运行环境: ${isCI ? 'CI/CD' : '本地'}`);
  
  // 提取KV命名空间ID
  KV_NAMESPACE_ID = extractKVNamespaceId();
  if (!KV_NAMESPACE_ID && !isCI) {
    console.error('请先在wrangler.toml中配置正确的KV命名空间ID');
    console.error('运行 `npx wrangler kv:namespace create TEMPLATES_KV` 创建KV命名空间');
    console.error('然后将生成的ID填入wrangler.toml文件');
    process.exit(1);
  }
  
  // 在CI环境中，验证所需的环境变量
  if (isCI) {
    if (!process.env.CF_API_TOKEN) {
      console.error('CI/CD环境中需要设置 CF_API_TOKEN 环境变量');
      process.exit(1);
    }
    if (!process.env.CF_ACCOUNT_ID) {
      console.error('CI/CD环境中需要设置 CF_ACCOUNT_ID 环境变量');
      process.exit(1);
    }
  }
  
  console.log('开始上传模板文件到Cloudflare KV...');
  
  // 处理模板目录
  processDirectory(TEMPLATE_DIR);
  
  console.log('模板文件上传完成！');
}

// 执行主函数
main(); 