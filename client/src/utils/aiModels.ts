import type { AIModel, AIProvider } from '../types';

/**
 * 支持的AI模型列表
 */
export const AI_MODELS: AIModel[] = [
  // 智谱AI模型
  {
    id: 'glm-4-flash',
    name: 'GLM-4-Flash',
    provider: 'zhipu',
    maxTokens: 128000,
    description: '智谱GLM-4 Flash模型，快速响应，适合日常对话'
  },
  {
    id: 'glm-4-plus',
    name: 'GLM-4-Plus',
    provider: 'zhipu',
    maxTokens: 128000,
    description: '智谱GLM-4 Plus模型，更强的推理能力'
  },
  {
    id: 'glm-4',
    name: 'GLM-4',
    provider: 'zhipu',
    maxTokens: 128000,
    description: '智谱GLM-4标准模型，平衡性能与速度'
  },
  {
    id: 'glm-4-air',
    name: 'GLM-4-Air',
    provider: 'zhipu',
    maxTokens: 128000,
    description: '智谱GLM-4 Air模型，轻量高效'
  },
  {
    id: 'glm-4-airx',
    name: 'GLM-4-AirX',
    provider: 'zhipu',
    maxTokens: 128000,
    description: '智谱GLM-4 AirX模型，极速响应'
  },
  
  // OpenAI模型
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    maxTokens: 128000,
    description: 'OpenAI最新多模态模型，性能强大'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    maxTokens: 128000,
    description: 'OpenAI轻量级模型，性价比高'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    maxTokens: 128000,
    description: 'OpenAI GPT-4 Turbo模型'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    maxTokens: 16384,
    description: 'OpenAI经典模型，速度快'
  },
  
  // Anthropic模型
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Anthropic最新模型，卓越的推理能力'
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Anthropic最强模型'
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Anthropic平衡型模型'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Anthropic轻量快速模型'
  }
];

/**
 * AI服务提供商配置
 */
export const AI_PROVIDERS: Record<AIProvider, { name: string; baseUrl: string; defaultModel: string }> = {
  zhipu: {
    name: '智谱AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash'
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini'
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022'
  }
};

/**
 * 默认API配置
 * 注意：API Key 应该由用户在设置中配置，不应该硬编码在代码中
 */
export const DEFAULT_API_CONFIG = {
  provider: 'zhipu' as AIProvider,
  modelId: 'glm-4-flash',
  apiKey: ''
};

/**
 * 根据提供商获取模型列表
 */
export const getModelsByProvider = (provider: AIProvider): AIModel[] => {
  return AI_MODELS.filter(model => model.provider === provider);
};

/**
 * 根据模型ID获取模型信息
 */
export const getModelById = (modelId: string): AIModel | undefined => {
  return AI_MODELS.find(model => model.id === modelId);
};
