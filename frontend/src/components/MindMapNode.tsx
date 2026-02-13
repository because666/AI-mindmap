/**
 * 思维导图节点组件
 * 自定义ReactFlow节点，展示节点信息和交互
 */

import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MessageSquare, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';

import type { Node } from '../types';

// 节点数据接口
interface MindMapNodeData extends Node {
  isSelected: boolean;
  onRename?: (nodeId: string, newTitle: string) => void;
}

/**
 * 思维导图节点组件
 * 
 * @param props - ReactFlow节点属性
 * @returns 节点组件
 */
const MindMapNode = memo(({ data, selected }: NodeProps) => {
  const node = (data as unknown) as MindMapNodeData;
  const hasChildren = node.child_ids.length > 0;
  const messageCount = node.messages.length;
  
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 当节点标题变化时更新编辑状态
  useEffect(() => {
    setEditTitle(node.title);
  }, [node.title]);
  
  // 进入编辑模式时聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  // 处理保存标题
  const handleSave = () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== node.title) {
      node.onRename?.(node.id, trimmedTitle);
    }
    setIsEditing(false);
  };
  
  // 处理按键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(node.title);
      setIsEditing(false);
    }
  };

  // 根据节点类型获取图标颜色
  const getTypeColor = () => {
    switch (node.type) {
      case 'root':
        return '#1976d2';
      case 'branch':
        return '#388e3c';
      case 'leaf':
        return '#f57c00';
      case 'composite':
        return '#7b1fa2';
      default:
        return '#757575';
    }
  };

  // 获取节点类型标签
  const getTypeLabel = () => {
    switch (node.type) {
      case 'root':
        return '根';
      case 'branch':
        return '分支';
      case 'leaf':
        return '叶子';
      case 'composite':
        return '复合';
      default:
        return '';
    }
  };

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        background: node.color,
        border: selected ? '2px solid #1976d2' : '1px solid #e0e0e0',
        boxShadow: selected
          ? '0 4px 12px rgba(25, 118, 210, 0.3)'
          : '0 2px 4px rgba(0,0,0,0.1)',
        minWidth: '180px',
        maxWidth: '280px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      {/* 连接点 - 顶部 */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: '10px',
          height: '10px',
          background: '#fff',
          border: '2px solid #999',
        }}
      />

      {/* 节点头部 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* 类型标签 */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: getTypeColor(),
              color: '#fff',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {getTypeLabel()}
          </span>

          {/* 折叠指示器 */}
          {hasChildren && (
            <span style={{ color: '#666' }}>
              {node.is_collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </span>
          )}
        </div>

        {/* 消息数量 */}
        {messageCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#666',
              background: 'rgba(0,0,0,0.05)',
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            <MessageSquare size={12} />
            <span>{messageCount}</span>
          </div>
        )}
      </div>

      {/* 节点标题 */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: node.type === 'root' ? 'bold' : 'normal',
          color: '#333',
          wordBreak: 'break-word',
          lineHeight: '1.4',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              fontSize: '14px',
              fontWeight: node.type === 'root' ? 'bold' : 'normal',
              border: '1px solid #1976d2',
              borderRadius: '4px',
              padding: '4px 8px',
              outline: 'none',
              minWidth: '120px',
            }}
            maxLength={100}
          />
        ) : (
          <>
            <span style={{ flex: 1 }}>{node.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              style={{
                padding: '2px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                opacity: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="重命名"
            >
              <Edit2 size={14} />
            </button>
          </>
        )}
      </div>

      {/* 最后消息预览 */}
      {messageCount > 0 && (
        <div
          style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            fontSize: '12px',
            color: '#666',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.messages[messageCount - 1].content.slice(0, 50)}
          {node.messages[messageCount - 1].content.length > 50 ? '...' : ''}
        </div>
      )}

      {/* 多父节点指示器 */}
      {node.parent_ids.length > 1 && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '10px',
            color: '#2196f3',
          }}
        >
          关联 {node.parent_ids.length} 个父节点
        </div>
      )}

      {/* 连接点 - 底部 */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: '10px',
          height: '10px',
          background: '#fff',
          border: '2px solid #999',
        }}
      />

      {/* 连接点 - 左侧 */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: '8px',
          height: '8px',
          background: '#fff',
          border: '2px solid #999',
        }}
      />

      {/* 连接点 - 右侧 */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: '8px',
          height: '8px',
          background: '#fff',
          border: '2px solid #999',
        }}
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';

export default MindMapNode;
