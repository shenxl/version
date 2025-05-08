/**
 * 将模板文件上传到Cloudflare KV的脚本
 * 使用方法: node upload-templates.js [--local|--remote] [--version=<版本号>]
 * 选项：
 *   --local      只上传到本地KV (默认)
 *   --remote     只上传到远程KV
 *   --both       同时上传到本地和远程KV
 *   --version    只上传指定版本的模板 (例如: --version=1.0.3)
 *                如果不指定，则使用wrangler.toml中的CURRENT_VERSION
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 模板目录
const TEMPLATE_DIR = path.join(__dirname, 'src', 'template');

// 解析命令行参数
let uploadTarget = 'local'; // 默认为本地
let specificVersion = null; // 默认为null，表示使用wrangler.toml中的版本

const args = process.argv.slice(2);
if (args.includes('--remote')) {
  uploadTarget = 'remote';
}
if (args.includes('--both')) {
  uploadTarget = 'both';
}

// 解析版本参数
const versionArg = args.find(arg => arg.startsWith('--version='));
if (versionArg) {
  specificVersion = versionArg.split('=')[1];
}

// 从wrangler.toml获取当前版本
function getCurrentVersion() {
  try {
    const wranglerConfig = fs.readFileSync(path.join(__dirname, 'wrangler.toml'), 'utf-8');
    const versionMatch = wranglerConfig.match(/CURRENT_VERSION\s*=\s*["']([^"']+)["']/);
    
    if (versionMatch && versionMatch[1]) {
      return versionMatch[1];
    }
    return null;
  } catch (error) {
    console.error('读取wrangler.toml中的版本失败:', error.message);
    return null;
  }
}

// 如果未指定版本，则使用wrangler.toml中的当前版本
if (!specificVersion) {
  specificVersion = getCurrentVersion();
  if (!specificVersion) {
    console.error('未指定版本且未能从wrangler.toml中读取版本信息');
    process.exit(1);
  }
}

console.log(`上传目标: ${uploadTarget === 'both' ? '本地和远程' : uploadTarget === 'remote' ? '远程' : '本地'}`);
console.log(`上传版本: ${specificVersion}`);

/**
 * 上传单个文件到KV
 */
function uploadFileToKV(filePath, kvKey, isLocal = true) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 构建命令，增加本地/远程选项
    let command = `npx wrangler kv key put --binding=TEMPLATES_KV "${kvKey}" '${content.replace(/'/g, "\\'")}'`;
    
    // 如果是远程上传，添加 --remote 标志
    if (!isLocal) {
      command += ' --remote';
    }
    
    console.log(`上传: ${filePath} -> ${kvKey} ${isLocal ? '(本地)' : '(远程)'}`);
    execSync(command, { stdio: 'inherit' });
    
    return true;
  } catch (error) {
    console.error(`上传失败 ${filePath} ${isLocal ? '(本地)' : '(远程)'}: ${error.message}`);
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
      
      // 根据上传目标选择上传位置
      if (uploadTarget === 'local' || uploadTarget === 'both') {
        uploadFileToKV(fullPath, relativePath, true);
      }
      
      if (uploadTarget === 'remote' || uploadTarget === 'both') {
        uploadFileToKV(fullPath, relativePath, false);
      }
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
  
  // 提取KV命名空间ID
  const kvNamespaceId = extractKVNamespaceId();
  if (!kvNamespaceId) {
    console.error('请先在wrangler.toml中配置正确的KV命名空间ID');
    console.error('运行 `npx wrangler kv namespace create TEMPLATES_KV` 创建KV命名空间');
    console.error('然后将生成的ID填入wrangler.toml文件');
    process.exit(1);
  }
  
  // 检查指定版本的模板目录是否存在
  const versionDir = path.join(TEMPLATE_DIR, specificVersion);
  if (!fs.existsSync(versionDir)) {
    console.error(`指定版本的模板目录不存在: ${versionDir}`);
    process.exit(1);
  }
  
  console.log(`开始上传版本 ${specificVersion} 的模板文件到Cloudflare KV...`);
  
  // 仅处理指定版本的模板目录
  processDirectory(versionDir, specificVersion);
  
  console.log(`版本 ${specificVersion} 的模板文件上传完成！`);
}

// 执行主函数
main().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
}); 