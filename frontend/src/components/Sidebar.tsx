/**
 * 侧边栏组件
 * 显示思维导图列表和导出功能
 */

import { useState } from 'react';
import {
  Plus,
  FileText,
  Download,
  Trash2,
  ChevronRight,
} from 'lucide-react';

import type { MindMap } from '../types';
import { mindmapApi, exportApi } from '../services/api';

interface SidebarProps {
  mindmaps: Array<{
    id: string;
    title: string;
    description?: string;
    created_at: string;
    updated_at: string;
    node_count: number;
  }>;
  currentMindmapId: string | null;
  onMindmapSelect: (mindmapId: string) => void;
  onMindmapCreate: (mindmap: MindMap) => void;
  onMindmapDelete: (mindmapId: string) => void;
  onRefresh: () => void;
}

/**
 * 侧边栏组件
 * 
 * @param props - 组件属性
 * @returns 侧边栏组件
 */
export const Sidebar = ({
  mindmaps,
  currentMindmapId,
  onMindmapSelect,
  onMindmapCreate,
  onMindmapDelete,
}: SidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newMindmapTitle, setNewMindmapTitle] = useState('');
  const [newMindmapDesc, setNewMindmapDesc] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);

  // 创建新思维导图
  const handleCreateMindmap = async () => {
    if (!newMindmapTitle.trim()) return;

    try {
      const result = await mindmapApi.create(newMindmapTitle, newMindmapDesc);
      if (result.success) {
        onMindmapCreate(result.data);
        setShowNewDialog(false);
        setNewMindmapTitle('');
        setNewMindmapDesc('');
      }
    } catch (error) {
      console.error('创建思维导图失败:', error);
      alert('创建思维导图失败');
    }
  };

  // 导出思维导图
  const handleExport = async (mindmapId: string, format: 'json' | 'markdown') => {
    setExportingId(mindmapId);
    try {
      if (format === 'json') {
        const result = await exportApi.toJSON(mindmapId);
        if (result.success) {
          const blob = new Blob([JSON.stringify(result.data, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${result.data.title}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else if (format === 'markdown') {
        const result = await exportApi.toMarkdown(mindmapId);
        if (result.success) {
          const blob = new Blob([result.data.markdown], {
            type: 'text/markdown',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `mindmap.md`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败');
    } finally {
      setExportingId(null);
    }
  };

  // 删除思维导图
  const handleDelete = async (mindmapId: string, title: string) => {
    if (!confirm(`确定要删除思维导图 "${title}" 吗？`)) return;

    try {
      await mindmapApi.delete(mindmapId);
      onMindmapDelete(mindmapId);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  return (
    <div
      style={{
        width: isExpanded ? '280px' : '48px',
        height: '100%',
        background: '#fff',
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {isExpanded && (
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
            }}
          >
            思流图
          </h2>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 新建按钮 */}
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          <button
            onClick={() => setShowNewDialog(true)}
            style={{
              width: '100%',
              padding: '10px',
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <Plus size={18} />
            新建思维导图
          </button>
        </div>
      )}

      {/* 思维导图列表 */}
      {isExpanded && (
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '0 16px',
          }}
        >
          <h3
            style={{
              fontSize: '12px',
              color: '#999',
              textTransform: 'uppercase',
              margin: '0 0 12px 0',
            }}
          >
            我的思维导图
          </h3>

          {mindmaps.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#999',
              }}
            >
              <FileText size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
              <p style={{ fontSize: '14px' }}>暂无思维导图</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mindmaps.map((mindmap) => (
                <div
                  key={mindmap.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('点击思维导图:', mindmap.id, mindmap.title);
                    onMindmapSelect(mindmap.id);
                  }}
                  style={{
                    padding: '12px',
                    background: currentMindmapId === mindmap.id ? '#e3f2fd' : '#f5f5f5',
                    border: currentMindmapId === mindmap.id ? '1px solid #1976d2' : '1px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: currentMindmapId === mindmap.id ? 'bold' : 'normal',
                        color: '#333',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {mindmap.title}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(mindmap.id, 'json');
                        }}
                        disabled={exportingId === mindmap.id}
                        style={{
                          padding: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          opacity: 0.6,
                        }}
                        title="导出JSON"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(mindmap.id, mindmap.title);
                        }}
                        style={{
                          padding: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          opacity: 0.6,
                          color: '#f44336',
                        }}
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{mindmap.node_count} 个节点</span>
                    <span>{new Date(mindmap.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 底部信息 */}
      {isExpanded && (
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #e0e0e0',
            fontSize: '12px',
            color: '#999',
            textAlign: 'center',
          }}
        >
          思流图 v1.0.0
        </div>
      )}

      {/* 新建对话框 */}
      {showNewDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              width: '400px',
              maxWidth: '90%',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0' }}>新建思维导图</h3>
            <input
              type="text"
              placeholder="标题"
              value={newMindmapTitle}
              onChange={(e) => setNewMindmapTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <textarea
              placeholder="描述（可选）"
              value={newMindmapDesc}
              onChange={(e) => setNewMindmapDesc(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewDialog(false)}
                style={{
                  padding: '8px 16px',
                  background: '#f5f5f5',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateMindmap}
                disabled={!newMindmapTitle.trim()}
                style={{
                  padding: '8px 16px',
                  background: newMindmapTitle.trim() ? '#1976d2' : '#e0e0e0',
                  color: newMindmapTitle.trim() ? '#fff' : '#999',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: newMindmapTitle.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
