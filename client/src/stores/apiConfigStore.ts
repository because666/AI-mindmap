import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { APIConfig, AIProvider } from '../types';
import { DEFAULT_API_CONFIG, AI_PROVIDERS } from '../utils/aiModels';

/**
 * API配置状态接口
 */
interface APIConfigState {
  config: APIConfig;
  setProvider: (provider: AIProvider) => void;
  setModel: (modelId: string) => void;
  setApiKey: (apiKey: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setConfig: (config: Partial<APIConfig>) => void;
  resetConfig: () => void;
}

/**
 * API配置状态管理Store
 */
export const useAPIConfigStore = create<APIConfigState>()(
  persist(
    (set) => ({
      config: DEFAULT_API_CONFIG,
      
      /**
       * 设置AI服务提供商
       */
      setProvider: (provider: AIProvider) => {
        const providerConfig = AI_PROVIDERS[provider];
        set((state) => ({
          config: {
            ...state.config,
            provider,
            modelId: providerConfig.defaultModel,
            baseUrl: providerConfig.baseUrl
          }
        }));
      },
      
      /**
       * 设置AI模型
       */
      setModel: (modelId: string) => {
        set((state) => ({
          config: {
            ...state.config,
            modelId
          }
        }));
      },
      
      /**
       * 设置API密钥
       */
      setApiKey: (apiKey: string) => {
        set((state) => ({
          config: {
            ...state.config,
            apiKey
          }
        }));
      },
      
      /**
       * 设置API基础URL
       */
      setBaseUrl: (baseUrl: string) => {
        set((state) => ({
          config: {
            ...state.config,
            baseUrl
          }
        }));
      },
      
      /**
       * 批量设置配置
       */
      setConfig: (newConfig: Partial<APIConfig>) => {
        set((state) => ({
          config: {
            ...state.config,
            ...newConfig
          }
        }));
      },
      
      /**
       * 重置为默认配置
       */
      resetConfig: () => {
        set({ config: DEFAULT_API_CONFIG });
      }
    }),
    {
      name: 'api-config-storage',
      partialize: (state) => ({ config: state.config })
    }
  )
);

/**
 * 获取当前API配置
 */
export const getAPIConfig = (): APIConfig => {
  return useAPIConfigStore.getState().config;
};
