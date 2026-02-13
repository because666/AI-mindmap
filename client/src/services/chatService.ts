import type { APIConfig, ChatMessage } from '../types';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    return '';
  }
  return 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * AI聊天服务
 */
export const chatService = {
  /**
   * 发送聊天消息
   */
  async sendMessage(
    messages: ChatMessage[],
    config: APIConfig
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          config: {
            provider: config.provider,
            model: config.modelId,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl
          }
        }),
      });

      const result = await response.json();
      
      return {
        success: result.success,
        content: result.content,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误'
      };
    }
  },

  /**
   * 测试API连接
   */
  async testConnection(config: APIConfig): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: config.provider,
          model: config.modelId,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl
        }),
      });

      const result = await response.json();
      
      return {
        success: result.success,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误'
      };
    }
  }
};
