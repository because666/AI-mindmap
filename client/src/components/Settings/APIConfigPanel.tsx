import React, { useState } from 'react';
import { Settings, Key, Cpu, ChevronDown, Eye, EyeOff, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import { AI_PROVIDERS, getModelsByProvider, AI_MODELS } from '../../utils/aiModels';
import type { AIProvider } from '../../types';

/**
 * API配置组件
 */
const APIConfigPanel: React.FC = () => {
  const { config, setProvider, setModel, setApiKey, setBaseUrl, resetConfig } = useAPIConfigStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);

  const currentProvider = AI_PROVIDERS[config.provider];
  const currentModels = getModelsByProvider(config.provider);
  const currentModel = AI_MODELS.find(m => m.id === config.modelId);

  /**
   * 处理提供商变更
   */
  const handleProviderChange = (provider: AIProvider) => {
    setProvider(provider);
    setIsProviderOpen(false);
    setTestResult(null);
  };

  /**
   * 处理模型变更
   */
  const handleModelChange = (modelId: string) => {
    setModel(modelId);
    setIsModelOpen(false);
    setTestResult(null);
  };

  /**
   * 测试API连接
   */
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      let apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl && !import.meta.env.PROD) {
        apiUrl = 'http://localhost:3001';
      }
      const response = await fetch(`${apiUrl}/api/ai/test`, {
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
      
      if (result.success) {
        setTestResult({ success: true, message: 'API连接测试成功！' });
      } else {
        setTestResult({ success: false, message: result.error || 'API连接测试失败' });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : '网络错误，请检查后端服务是否启动' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-dark-700">
        <Settings className="w-5 h-5 text-primary-400" />
        <h2 className="text-lg font-semibold text-white">API 配置</h2>
      </div>

      {/* AI服务提供商选择 */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
          <Cpu className="w-4 h-4" />
          AI 服务提供商
        </label>
        <div className="relative">
          <button
            onClick={() => setIsProviderOpen(!isProviderOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white hover:border-primary-500 transition-colors"
          >
            <span>{currentProvider.name}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isProviderOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isProviderOpen && (
            <div className="absolute z-10 w-full mt-2 bg-dark-700 border border-dark-600 rounded-lg shadow-lg overflow-hidden">
              {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleProviderChange(provider)}
                  className={`w-full px-4 py-3 text-left hover:bg-dark-600 transition-colors ${
                    config.provider === provider ? 'bg-dark-600 text-primary-400' : 'text-white'
                  }`}
                >
                  {AI_PROVIDERS[provider].name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI模型选择 */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
          <Cpu className="w-4 h-4" />
          AI 模型
        </label>
        <div className="relative">
          <button
            onClick={() => setIsModelOpen(!isModelOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white hover:border-primary-500 transition-colors"
          >
            <div className="text-left">
              <div>{currentModel?.name || config.modelId}</div>
              {currentModel && (
                <div className="text-xs text-dark-400 mt-1">{currentModel.description}</div>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isModelOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isModelOpen && (
            <div className="absolute z-10 w-full mt-2 bg-dark-700 border border-dark-600 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              {currentModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-dark-600 transition-colors ${
                    config.modelId === model.id ? 'bg-dark-600 text-primary-400' : 'text-white'
                  }`}
                >
                  <div>{model.name}</div>
                  <div className="text-xs text-dark-400 mt-1">{model.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API密钥输入 */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
          <Key className="w-4 h-4" />
          API 密钥
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="请输入API密钥"
            className="w-full px-4 py-3 pr-12 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none transition-colors"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-dark-400">
          {config.provider === 'zhipu' && '获取密钥：https://open.bigmodel.cn/'}
          {config.provider === 'openai' && '获取密钥：https://platform.openai.com/api-keys'}
          {config.provider === 'anthropic' && '获取密钥：https://console.anthropic.com/'}
        </p>
      </div>

      {/* 自定义API地址（可选） */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
          API 基础地址（可选）
        </label>
        <input
          type="text"
          value={config.baseUrl || ''}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={currentProvider.baseUrl}
          className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none transition-colors"
        />
        <p className="text-xs text-dark-400">留空使用默认地址，支持自定义代理地址</p>
      </div>

      {/* 测试结果提示 */}
      {testResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          testResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
        }`}>
          {testResult.success ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-sm">{testResult.message}</span>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-3 pt-4">
        <button
          onClick={handleTestConnection}
          disabled={isTesting || !config.apiKey}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isTesting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              测试中...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              测试连接
            </>
          )}
        </button>
        
        <button
          onClick={resetConfig}
          className="px-4 py-2 bg-dark-600 text-white rounded-lg hover:bg-dark-500 transition-colors"
        >
          重置默认
        </button>
      </div>
    </div>
  );
};

export default APIConfigPanel;
