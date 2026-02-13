import React, { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
}

/**
 * 全局搜索面板组件
 */
const SearchPanel: React.FC<SearchPanelProps> = ({ isOpen, onClose, onNodeSelect }) => {
  const { searchQuery, setSearchQuery, searchResults, nodes, conversations } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleResultClick = (nodeId: string) => {
    onNodeSelect(nodeId);
    onClose();
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl mx-4 bg-dark-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 搜索输入 */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-dark-700">
          <Search className="w-5 h-5 text-dark-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索节点标题、摘要、对话内容..."
            className="flex-1 bg-transparent text-white placeholder-dark-400 focus:outline-none text-lg"
          />
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* 搜索结果 */}
        <div className="max-h-96 overflow-y-auto">
          {searchQuery.trim() === '' ? (
            <div className="px-6 py-8 text-center text-dark-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>输入关键词开始搜索</p>
              <p className="text-sm mt-1">支持搜索节点标题、摘要和对话内容</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="px-6 py-8 text-center text-dark-400">
              <p>未找到匹配的结果</p>
              <p className="text-sm mt-1">尝试使用不同的关键词</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {searchResults.map((result) => {
                const node = nodes.get(result.nodeId);
                if (!node) return null;
                
                return (
                  <button
                    key={result.nodeId}
                    onClick={() => handleResultClick(result.nodeId)}
                    className="w-full px-6 py-4 text-left hover:bg-dark-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">
                          {node.title}
                        </h3>
                        <div className="mt-2 space-y-1">
                          {result.matches.slice(0, 3).map((match, idx) => (
                            <p key={idx} className="text-sm text-dark-400 truncate">
                              {match}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-dark-400">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs">定位</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        {/* 底部提示 */}
        <div className="px-6 py-3 border-t border-dark-700 bg-dark-900">
          <p className="text-xs text-dark-400">
            找到 {searchResults.length} 个结果 • 按 ESC 关闭
          </p>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;
