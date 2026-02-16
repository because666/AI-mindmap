/**
 * 思流图（ThinkFlowMap）API服务
 * 封装所有后端API调用
 */

import type {
  MindMap,
  Node,
  Edge,
  CreateNodeRequest,
  UpdateNodeRequest,
  CreateEdgeRequest,
  ChatRequest,
  ChatResponse,
  StreamMessage,
  AIStatus,
} from '../types';

// API基础URL - 生产环境使用相对路径，开发环境使用localhost
// 通过检查当前host来判断环境
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? 'http://localhost:8000' : '';

/**
 * 通用请求方法
 * 
 * @param url - 请求URL
 * @param options - 请求选项
 * @returns 响应数据
 */
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 思维导图API
 */
export const mindmapApi = {
  /**
   * 创建思维导图
   * 
   * @param title - 标题
   * @param description - 描述
   * @returns 创建的思维导图
   */
  create: (title: string, description?: string): Promise<{ success: boolean; data: MindMap }> =>
    apiRequest('/api/mindmaps', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    }),

  /**
   * 获取所有思维导图列表
   * 
   * @returns 思维导图列表
   */
  list: (): Promise<{ success: boolean; data: Array<{
    id: string;
    title: string;
    description?: string;
    created_at: string;
    updated_at: string;
    node_count: number;
  }> }> =>
    apiRequest('/api/mindmaps'),

  /**
   * 获取指定思维导图
   * 
   * @param mindmapId - 思维导图ID
   * @returns 思维导图数据
   */
  get: (mindmapId: string): Promise<{ success: boolean; data: MindMap }> =>
    apiRequest(`/api/mindmaps/${mindmapId}`),

  /**
   * 删除思维导图
   * 
   * @param mindmapId - 思维导图ID
   * @returns 删除结果
   */
  delete: (mindmapId: string): Promise<{ success: boolean; message: string }> =>
    apiRequest(`/api/mindmaps/${mindmapId}`, { method: 'DELETE' }),
};

/**
 * 节点API
 */
export const nodeApi = {
  /**
   * 创建节点
   * 
   * @param mindmapId - 思维导图ID
   * @param requestData - 创建节点请求
   * @returns 创建的节点
   */
  create: (mindmapId: string, requestData: CreateNodeRequest): Promise<{ success: boolean; data: Node }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/nodes`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),

  /**
   * 
   * @param mindmapId - 思维导图ID
   * @param nodeId - 节点ID
   * @param requestData - 更新节点请求
   * @returns 更新后的节点
   */
  update: (mindmapId: string, nodeId: string, requestData: UpdateNodeRequest): Promise<{ success: boolean; data?: Node; error?: string }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    }),

  /**
   * 删除节点
   * 
   * @param mindmapId - 思维导图ID
   * @param nodeId - 节点ID
   * @returns 删除结果
   */
  delete: (mindmapId: string, nodeId: string): Promise<{ success: boolean; message: string }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/nodes/${nodeId}`, { method: 'DELETE' }),

  /**
   * 移动节点
   * 
   * @param mindmapId - 思维导图ID
   * @param nodeId - 节点ID
   * @param positionX - X坐标
   * @param positionY - Y坐标
   * @returns 更新后的节点
   */
  move: (mindmapId: string, nodeId: string, positionX: number, positionY: number): Promise<{ success: boolean; data: Node }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/nodes/${nodeId}/move?position_x=${positionX}&position_y=${positionY}`, {
      method: 'POST',
    }),

  /**
   * 获取节点上下文
   * 
   * @param mindmapId - 思维导图ID
   * @param nodeId - 节点ID
   * @returns 上下文消息列表
   */
  getContext: (mindmapId: string, nodeId: string): Promise<{ success: boolean; data: Array<{ role: string; content: string }> }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/nodes/${nodeId}/context`),
};

/**
 * 关系线API
 */
export const edgeApi = {
  /**
   * 创建关系线
   * 
   * @param mindmapId - 思维导图ID
   * @param requestData - 创建关系线请求
   * @returns 创建的关系线
   */
  create: (mindmapId: string, requestData: CreateEdgeRequest): Promise<{ success: boolean; data: Edge }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/edges`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),

  /**
   * 删除关系线
   * 
   * @param mindmapId - 思维导图ID
   * @param edgeId - 关系线ID
   * @returns 删除结果
   */
  delete: (mindmapId: string, edgeId: string): Promise<{ success: boolean; message: string }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/edges/${edgeId}`, { method: 'DELETE' }),
};

/**
 * AI对话API
 */
export const chatApi = {
  /**
   * 非流式对话
   * 
   * @param mindmapId - 思维导图ID
   * @param requestData - 对话请求
   * @returns 对话响应
   */
  send: (mindmapId: string, requestData: ChatRequest): Promise<{ success: boolean; data: ChatResponse }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/chat`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),

  /**
   * 流式对话
   * 
   * @param mindmapId - 思维导图ID
   * @param requestData - 对话请求
   * @param onMessage - 消息回调
   * @param onError - 错误回调
   * @param onComplete - 完成回调
   */
  sendStream: (
    mindmapId: string,
    requestData: ChatRequest,
    onMessage: (message: StreamMessage) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): void => {
    // 使用fetch实现POST方式的SSE
    fetch(`${API_BASE_URL}/api/mindmaps/${mindmapId}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamMessage = JSON.parse(line.slice(6));
              onMessage(data);

              if (data.type === 'done') {
                onComplete?.();
                return;
              }
            } catch (e) {
              console.error('解析流式消息失败:', e);
            }
          }
        }
      }

      onComplete?.();
    }).catch((error) => {
      onError?.(error);
    });
  },
};

/**
 * 导出API
 */
export const exportApi = {
  /**
   * 导出为JSON
   * 
   * @param mindmapId - 思维导图ID
   * @returns JSON数据
   */
  toJSON: (mindmapId: string): Promise<{ success: boolean; data: MindMap }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/export/json`),

  /**
   * 导出为Markdown
   * 
   * @param mindmapId - 思维导图ID
   * @returns Markdown文本
   */
  toMarkdown: (mindmapId: string): Promise<{ success: boolean; data: { markdown: string } }> =>
    apiRequest(`/api/mindmaps/${mindmapId}/export/markdown`),
};

/**
 * 配置API
 */
export const configApi = {
  /**
   * 配置AI服务
   * 
   * @param apiKey - API密钥
   * @returns 配置结果
   */
  configureAI: (apiKey: string): Promise<{ success: boolean; message: string }> =>
    apiRequest('/api/config/ai', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    }),

  /**
   * 获取AI服务状态
   * 
   * @returns AI服务状态
   */
  getAIStatus: (): Promise<{ success: boolean; data: AIStatus }> =>
    apiRequest('/api/config/ai/status'),
};

export default {
  mindmap: mindmapApi,
  node: nodeApi,
  edge: edgeApi,
  chat: chatApi,
  export: exportApi,
  config: configApi,
};
