/**
 * KDocs API 转发 Worker 与 QuickConfig Templates API
 */

// 导入模板文件
import versionJson from './template/version.json';

// 处理请求的主函数
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 处理 OPTIONS 请求（CORS预检）
  if (method === "OPTIONS") {
    return handleCors(request);
  }
  
  // 新增：路由匹配 /api/version - 获取最新版本号
  if (method === "GET" && path === "/api/version") {
    try {
      // 从环境变量获取版本，如果没有设置则使用模板中定义的版本
      const version = env.CURRENT_VERSION || versionJson.version || "1.0.0";
      
      return new Response(JSON.stringify({ version }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      // 错误处理
      return new Response(JSON.stringify({
        error: "处理请求时出错",
        details: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
  
  // 新增：模板文件路由匹配 /template/{version}/{typeFolder}/{fileName}
  const templatePattern = /^\/template\/([^\/]+)\/([^\/]+)\/([^\/]+)$/;
  if (method === "GET" && templatePattern.test(path)) {
    try {
      const matches = path.match(templatePattern);
      const version = matches[1];
      const typeFolder = matches[2];
      const fileName = matches[3];
      
      // 获取文件扩展名以确定Content-Type
      const fileExtension = fileName.split('.').pop().toLowerCase();
      let contentType = 'application/json'; // 默认为JSON
      
      // 根据扩展名设置Content-Type
      if (fileExtension === 'csv') {
        contentType = 'text/csv';
      } else if (fileExtension === 'txt') {
        contentType = 'text/plain';
      } else if (fileExtension === 'html') {
        contentType = 'text/html';
      } else if (fileExtension === 'xml') {
        contentType = 'application/xml';
      }
      
      // 这里需要配合Cloudflare KV或R2来返回对应的模板文件
      // 如果您使用了KV存储，可以从KV获取模板内容
      if (env.TEMPLATES_KV) {
        const key = `${version}/${typeFolder}/${fileName}`;
        const templateContent = await env.TEMPLATES_KV.get(key);
        
        if (templateContent) {
          return new Response(templateContent, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      
      // 如果没有找到模板，返回404
      return new Response(JSON.stringify({ 
        error: "模板文件不存在",
        requestedPath: path
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      // 错误处理
      return new Response(JSON.stringify({
        error: "处理模板请求时出错",
        details: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
  
  // 路由匹配 /v1/wo/file/<fileid>/script/<taskid>/sync_task
  const syncTaskPattern = /^\/v1\/wo\/file\/([^\/]+)\/script\/([^\/]+)\/sync_task$/;
  if (method === "POST" && syncTaskPattern.test(path)) {
    const matches = path.match(syncTaskPattern);
    const fileId = matches[1];
    const taskId = matches[2];
    
    try {
      // 读取请求体
      const requestData = await request.json();
      
      // 转发请求到KDocs API
      const result = await forwardToKDocsAPI(fileId, taskId, requestData, env.AirScript_Token);
      
      // 返回KDocs API的响应
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      // 错误处理
      return new Response(JSON.stringify({
        error: "处理请求时出错",
        details: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
  
  // 如果没有匹配的路由
  return new Response(JSON.stringify({ error: "未找到请求的资源" }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * 转发请求到KDocs API
 */
async function forwardToKDocsAPI(fileId, taskId, data, token) {
  const kdocsEndpoint = `https://365.kdocs.cn/api/v3/ide/file/${fileId}/script/${taskId}/sync_task`;
  
  const headers = new Headers();
  headers.append("Origin", ".kdocs.cn");
  headers.append("Content-Type", "application/json");
  headers.append("AirScript-Token", token);
  
  const requestOptions = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
    redirect: "follow"
  };
  
  // 发送请求到KDocs API
  const response = await fetch(kdocsEndpoint, requestOptions);
  
  // 检查响应状态
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KDocs API 错误: ${response.status} ${errorText}`);
  }
  
  // 解析并返回响应
  return await response.json();
}

// 处理CORS逻辑
function handleCors(request) {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, AirScript-Token",
    },
  });
}

// 添加CORS头到所有响应
function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// 导出fetch处理函数
export default {
  async fetch(request, env, ctx) {
    try {
      // 获取响应
      const response = await handleRequest(request, env);
      // 添加CORS头
      return addCorsHeaders(response);
    } catch (error) {
      // 错误处理
      return new Response(JSON.stringify({ 
        error: "服务器内部错误", 
        details: error.message 
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
}; 