/**
 * RESTful API Worker 
 */

// 内存数据存储示例（在生产环境中应使用KV或D1等持久化存储）
const items = new Map();

// 请求路由和处理程序
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 路由匹配
  if (path === '/') {
    return new Response(JSON.stringify({ 
      message: `欢迎使用Node.js Cloudflare Worker! ${env.MESSAGE}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 获取所有项目
  if (path === '/items' && method === 'GET') {
    return new Response(JSON.stringify(Array.from(items.values())), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 获取单个项目
  if (path.match(/^\/items\/\d+$/) && method === 'GET') {
    const id = path.split('/').pop();
    if (items.has(id)) {
      return new Response(JSON.stringify(items.get(id)), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: '项目不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 创建项目
  if (path === '/items' && method === 'POST') {
    try {
      const body = await request.json();
      if (!body.name || !body.price) {
        return new Response(JSON.stringify({ error: '名称和价格为必填项' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const id = Date.now().toString();
      const newItem = {
        id,
        name: body.name,
        description: body.description || '',
        price: body.price,
        tax: body.tax || null
      };
      
      items.set(id, newItem);
      
      return new Response(JSON.stringify(newItem), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: '无效的JSON数据' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // 更新项目
  if (path.match(/^\/items\/\d+$/) && method === 'PUT') {
    const id = path.split('/').pop();
    if (!items.has(id)) {
      return new Response(JSON.stringify({ error: '项目不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const body = await request.json();
      const existingItem = items.get(id);
      const updatedItem = {
        id,
        name: body.name || existingItem.name,
        description: body.description !== undefined ? body.description : existingItem.description,
        price: body.price || existingItem.price,
        tax: body.tax !== undefined ? body.tax : existingItem.tax
      };
      
      items.set(id, updatedItem);
      
      return new Response(JSON.stringify(updatedItem), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: '无效的JSON数据' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // 删除项目
  if (path.match(/^\/items\/\d+$/) && method === 'DELETE') {
    const id = path.split('/').pop();
    if (!items.has(id)) {
      return new Response(JSON.stringify({ error: '项目不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    items.delete(id);
    return new Response(null, { status: 204 });
  }
  
  // 处理OPTIONS请求（CORS预检）
  if (method === 'OPTIONS') {
    return handleCors(request);
  }
  
  // 如果没有匹配的路由
  return new Response(JSON.stringify({ error: '未找到请求的资源' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 处理CORS逻辑
function handleCors(request) {
  // 返回CORS头
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// 添加CORS头到所有响应
function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  
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
      return new Response(JSON.stringify({ error: '服务器内部错误', details: error.message }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
}; 