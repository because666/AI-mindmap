import React from 'react';
import { Undo2, Redo2, Clock, RotateCcw } from 'lucide-react';
import { useAppStore, type HistoryRecord } from '../../stores/appStore';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 历史版本管理面板
 */
const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose }) => {
  const { history, historyIndex, undo, redo } = useAppStore();

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const getActionIcon = (actionType: HistoryRecord['actionType']) => {
    switch (actionType) {
      case 'create_node':
        return '➕';
      case 'update_node':
        return '✏️';
      case 'delete_node':
        return '🗑️';
      case 'create_relation':
        return '🔗';
      case 'delete_relation':
        return '✂️';
      case 'move_node':
        return '↔️';
      case 'update_conversation':
        return '💬';
      default:
        return '📝';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-14 right-0 w-80 bg-dark-800 border-l border-dark-700 h-[calc(100vh-56px)] overflow-hidden flex flex-col z-40">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-400" />
          <h3 className="text-white font-medium">操作历史</h3>
        </div>
      </div>

      {/* 撤销/重做按钮 */}
      <div className="flex gap-2 p-4 border-b border-dark-700">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 className="w-4 h-4" />
          撤销
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Redo2 className="w-4 h-4" />
          重做
        </button>
      </div>

      {/* 历史列表 */}
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="px-4 py-8 text-center text-dark-400">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无操作历史</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {[...history].reverse().map((record, idx) => {
              const actualIndex = history.length - 1 - idx;
              const isCurrentPosition = actualIndex === historyIndex;
              const isPast = actualIndex <= historyIndex;
              
              return (
                <div
                  key={record.id}
                  className={`px-4 py-3 ${
                    isCurrentPosition 
                      ? 'bg-primary-600/20 border-l-2 border-primary-500' 
                      : isPast 
                        ? 'bg-dark-700/30' 
                        : 'opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getActionIcon(record.actionType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {record.description}
                      </p>
                      <p className="text-xs text-dark-400 mt-1">
                        {new Date(record.timestamp).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    {isCurrentPosition && (
                      <span className="text-xs text-primary-400">当前</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-3 border-t border-dark-700 bg-dark-900">
        <p className="text-xs text-dark-400">
          共 {history.length} 条记录 • 当前位置: {historyIndex + 1}
        </p>
      </div>
    </div>
  );
};

export default HistoryPanel;
