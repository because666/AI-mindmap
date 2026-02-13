import React, { useState, useEffect } from 'react';
import { Settings, FolderOpen, Search, MessageSquare, Network, X, Clock, Undo2, Redo2 } from 'lucide-react';
import SettingsModal from '../Settings/SettingsModal';
import ChatPanel from '../Chat/ChatPanel';
import SearchPanel from '../Search/SearchPanel';
import HistoryPanel from '../History/HistoryPanel';
import { useAppStore } from '../../stores/appStore';
import { useUISettingsStore } from '../../stores/uiSettingsStore';

/**
 * 主布局组件
 */
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'chat'>('canvas');
  
  const { selectedNodeId, selectNode, undo, redo, history, historyIndex } = useAppStore();
  const { autoOpenChatOnLoad, chatPanelWidth } = useUISettingsStore();
  
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  /**
   * 页面加载时自动打开AI对话窗口
   */
  useEffect(() => {
    if (autoOpenChatOnLoad) {
      const timer = setTimeout(() => {
        setIsChatOpen(true);
        setActiveTab('chat');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoOpenChatOnLoad]);

  /**
   * 打开对话窗口
   */
  const openChat = () => {
    setIsChatOpen(true);
    setActiveTab('chat');
  };

  /**
   * 关闭对话窗口
   */
  const closeChat = () => {
    setIsChatOpen(false);
  };

  /**
   * 处理搜索结果定位
   */
  const handleNodeLocate = (nodeId: string) => {
    selectNode(nodeId);
  };

  return (
    <div className="h-screen flex bg-dark-950">
      {/* 左侧边栏 */}
      <aside className="w-14 bg-dark-900 border-r border-dark-700 flex flex-col items-center py-4 gap-2">
        {/* Logo */}
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
          <Network className="w-6 h-6 text-white" />
        </div>
        
        {/* 导航按钮 */}
        <button
          onClick={() => { setActiveTab('canvas'); closeChat(); }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'canvas' && !isChatOpen
              ? 'bg-primary-600 text-white' 
              : 'text-dark-400 hover:text-white hover:bg-dark-700'
          }`}
          title="思维画布"
        >
          <Network className="w-5 h-5" />
        </button>
        
        <button
          onClick={openChat}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isChatOpen
              ? 'bg-primary-600 text-white' 
              : 'text-dark-400 hover:text-white hover:bg-dark-700'
          }`}
          title="对话"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        
        <div className="w-6 h-px bg-dark-700 my-2" />
        
        {/* 撤销/重做 */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            canUndo
              ? 'text-dark-400 hover:text-white hover:bg-dark-700'
              : 'text-dark-600 cursor-not-allowed'
          }`}
          title="撤销"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            canRedo
              ? 'text-dark-400 hover:text-white hover:bg-dark-700'
              : 'text-dark-600 cursor-not-allowed'
          }`}
          title="重做"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        
        <div className="flex-1" />
        
        {/* 底部按钮 */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
          title="搜索"
        >
          <Search className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isHistoryOpen
              ? 'bg-primary-600 text-white'
              : 'text-dark-400 hover:text-white hover:bg-dark-700'
          }`}
          title="历史"
        >
          <Clock className="w-5 h-5" />
        </button>
        
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
          title="文件"
        >
          <FolderOpen className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
          title="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
        
        {/* 聊天面板 - 带过渡动画 */}
        <div 
          className={`border-l border-dark-700 flex flex-col bg-dark-900 transition-all duration-300 ease-in-out ${
            isChatOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none absolute right-0'
          }`}
          style={{ width: isChatOpen ? chatPanelWidth : 0 }}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-dark-700 bg-dark-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary-400" />
              <span className="text-white font-medium">AI 对话</span>
            </div>
            <button
              onClick={closeChat}
              className="p-1 text-dark-400 hover:text-white hover:bg-dark-700 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel nodeId={selectedNodeId} />
          </div>
        </div>
        
        {/* 历史面板 */}
        <HistoryPanel
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      </main>

      {/* 设置弹窗 */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
      
      {/* 搜索弹窗 */}
      <SearchPanel
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNodeSelect={handleNodeLocate}
      />
    </div>
  );
};

export default MainLayout;
