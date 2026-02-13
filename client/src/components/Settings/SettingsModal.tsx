import React, { useState } from 'react';
import { X, Settings as SettingsIcon, Sliders, Key } from 'lucide-react';
import APIConfigPanel from './APIConfigPanel';
import UISettingsPanel from './UISettingsPanel';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'api' | 'ui';

/**
 * 设置弹窗组件
 */
const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ui');

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'ui', label: '界面设置', icon: <Sliders className="w-4 h-4" /> },
    { id: 'api', label: 'API配置', icon: <Key className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative w-full max-w-2xl mx-4 bg-dark-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* 标签页导航 */}
        <div className="flex border-b border-dark-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-400 border-b-2 border-primary-400 bg-dark-800/50'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800/30'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* 内容区域 */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'ui' && <UISettingsPanel />}
          {activeTab === 'api' && <APIConfigPanel />}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
