/**
 * 对话面板组件
 * 显示节点的对话历史，支持与AI进行对话
 * 支持无限层级多分支连续对话和非线性跳转
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Brain, Settings, MessageCircle, History, GitBranch } from 'lucide-react';
import { marked } from 'marked';

import type { Node, Message, MindMap } from '../types';
import { chatApi } from '../services/api';

// 配置marked选项
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface ChatPanelProps {
  mindmap: MindMap;
  selectedNode: Node | null;
  onNodeUpdate: (node: Node) => void;
  onNodeSelect?: (nodeId: string) => void;
}

/**
 * Markdown内容组件
 * 将Markdown文本渲染为HTML
 */
const MarkdownContent = ({ content }: { content: string }) => {
  // 直接渲染Markdown，不使用useMemo
  const html = (() => {
    try {
      return marked(content);
    } catch (e) {
      return content;
    }
  })();

  return (
    <div
      style={{
        wordBreak: 'break-word',
        lineHeight: '1.6',
      }}
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/**
 * 消息气泡组件
 * 
 * @param props - 消息属性
 * @returns 消息气泡组件
 */
const MessageBubble = ({ message, onClick }: { message: Message; onClick?: () => void }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // 系统消息（上下文提示）
  if (isSystem) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '8px 0',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: '#666',
            background: '#f5f5f5',
            padding: '4px 12px',
            borderRadius: '12px',
          }}
        >
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        margin: '12px 0',
        gap: '8px',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {!isUser && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#e3f2fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bot size={18} color="#1976d2" />
        </div>
      )}

      <div style={{ maxWidth: '70%' }}>
        {/* AI思考内容 */}
        {!isUser && message.reasoning_content && (
          <div
            style={{
              background: '#fff3e0',
              border: '1px solid #ffcc80',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '4px',
              fontSize: '13px',
              color: '#e65100',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Brain size={14} />
              <span style={{ fontWeight: 'bold' }}>思考过程</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{message.reasoning_content}</div>
          </div>
        )}

        {/* 消息内容 - 使用Markdown渲染 */}
        <div
          style={{
            background: isUser ? '#1976d2' : '#f5f5f5',
            color: isUser ? '#fff' : '#333',
            padding: '10px 14px',
            borderRadius: '12px',
            borderBottomRightRadius: isUser ? '4px' : '12px',
            borderBottomLeftRadius: isUser ? '12px' : '4px',
            transition: 'all 0.2s ease',
          }}
        >
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>

        {/* 时间戳 */}
        <div
          style={{
            fontSize: '11px',
            color: '#999',
            marginTop: '4px',
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {isUser && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#1976d2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <User size={18} color="#fff" />
        </div>
      )}
    </div>
  );
};

/**
 * 节点历史记录项组件
 */
const NodeHistoryItem = ({ 
  node, 
  isActive, 
  onClick,
  messageCount 
}: { 
  node: Node; 
  isActive: boolean; 
  onClick: () => void;
  messageCount: number;
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        background: isActive ? '#e3f2fd' : '#fff',
        border: isActive ? '1px solid #1976d2' : '1px solid #e0e0e0',
        borderRadius: '8px',
        cursor: 'pointer',
        marginBottom: '8px',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <GitBranch size={16} color={isActive ? '#1976d2' : '#666'} />
        <span style={{ 
          fontSize: '14px', 
          fontWeight: isActive ? 'bold' : 'normal',
          color: '#333',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {node.title}
        </span>
        <span style={{ 
          fontSize: '11px', 
          color: '#999',
          background: '#f5f5f5',
          padding: '2px 6px',
          borderRadius: '10px'
        }}>
          {messageCount}条
        </span>
      </div>
      {node.messages.length > 0 && (
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginTop: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {node.messages[node.messages.length - 1].content.slice(0, 50)}
          {node.messages[node.messages.length - 1].content.length > 50 ? '...' : ''}
        </div>
      )}
    </div>
  );
};

/**
 * 对话面板组件
 * 
 * @param props - 组件属性
 * @returns 对话面板组件
 */
export const ChatPanel = ({
  mindmap,
  selectedNode,
  onNodeUpdate,
  onNodeSelect,
}: ChatPanelProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [enableThinking, setEnableThinking] = useState(true);
  const [temperature, setTemperature] = useState(1.0);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedNode?.messages, streamingContent, scrollToBottom]);

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputMessage]);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !selectedNode || isLoading) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setStreamingContent('');
    setStreamingReasoning('');

    try {
      // 使用流式对话
      chatApi.sendStream(
        mindmap.id,
        {
          node_id: selectedNode.id,
          message: message,
          enable_thinking: enableThinking,
          temperature: temperature,
        },
        (streamMsg) => {
          if (streamMsg.type === 'reasoning') {
            setStreamingReasoning((prev) => prev + (streamMsg.content || ''));
          } else if (streamMsg.type === 'content') {
            setStreamingContent((prev) => prev + (streamMsg.content || ''));
          } else if (streamMsg.type === 'error') {
            console.error('流式消息错误:', streamMsg.content);
          }
        },
        (error) => {
          console.error('对话失败:', error);
          setIsLoading(false);
        },
        async () => {
          // 对话完成，刷新节点数据
          try {
            // 重新获取完整节点数据 - 使用动态API基础URL
            const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            const nodeResult = await fetch(`${apiBase}/api/mindmaps/${mindmap.id}`)
              .then(r => r.json());
            if (nodeResult.success) {
              const freshNode = nodeResult.data.nodes[selectedNode.id];
              if (freshNode) {
                onNodeUpdate(freshNode);
              }
            }
          } catch (error) {
            console.error('刷新节点数据失败:', error);
          }
          setIsLoading(false);
          setStreamingContent('');
          setStreamingReasoning('');
        }
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      setIsLoading(false);
    }
  }, [inputMessage, selectedNode, mindmap.id, enableThinking, temperature, isLoading, onNodeUpdate]);

  // 处理按键
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // 切换到其他节点
  const handleSwitchNode = (nodeId: string) => {
    onNodeSelect?.(nodeId);
    setShowHistory(false);
  };

  // 获取所有有对话历史的节点
  const nodesWithHistory = Object.values(mindmap.nodes)
    .filter(node => node.messages.length > 0)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // 如果没有选中节点
  if (!selectedNode) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          color: '#999',
        }}
      >
        <Bot size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
        <p>选择一个节点开始对话</p>
        {nodesWithHistory.length > 0 && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', marginBottom: '10px' }}>最近对话的节点:</p>
            {nodesWithHistory.slice(0, 3).map(node => (
              <div
                key={node.id}
                onClick={() => handleSwitchNode(node.id)}
                style={{
                  padding: '8px 12px',
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#333',
                }}
              >
                {node.title}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedNode.title}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
            {selectedNode.messages.length} 条消息
            {selectedNode.inherit_parent_context && ' · 继承父节点上下文'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '8px',
              background: showHistory ? '#e3f2fd' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
            title="对话历史"
          >
            <History size={20} color={showHistory ? '#1976d2' : '#666'} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: '8px',
              background: showSettings ? '#e3f2fd' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
            title="设置"
          >
            <Settings size={20} color={showSettings ? '#1976d2' : '#666'} />
          </button>
        </div>
      </div>

      {/* 历史记录面板 */}
      {showHistory && (
        <div
          style={{
            maxHeight: '200px',
            overflow: 'auto',
            padding: '12px',
            background: '#f8f9fa',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#666' }}>
            对话历史记录
          </h4>
          {nodesWithHistory.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
              暂无对话历史
            </p>
          ) : (
            nodesWithHistory.map(node => (
              <NodeHistoryItem
                key={node.id}
                node={node}
                isActive={node.id === selectedNode.id}
                onClick={() => handleSwitchNode(node.id)}
                messageCount={node.messages.length}
              />
            ))
          )}
        </div>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <div
          style={{
            padding: '16px',
            background: '#f5f5f5',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableThinking}
                onChange={(e) => setEnableThinking(e.target.checked)}
              />
              <span>启用深度思考</span>
            </label>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              温度参数: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          background: '#fafafa',
        }}
      >
        {selectedNode.messages.length === 0 && !isLoading && (
          <div
            style={{
              textAlign: 'center',
              color: '#999',
              padding: '40px 0',
            }}
          >
            <MessageCircle size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <p>开始与AI对话</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              在此节点进行的所有对话都会被完整保存
            </p>
          </div>
        )}

        {selectedNode.messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message}
          />
        ))}

        {/* 流式输出内容 */}
        {isLoading && (streamingContent || streamingReasoning) && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '12px 0', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#e3f2fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bot size={18} color="#1976d2" />
            </div>
            <div style={{ maxWidth: '70%' }}>
              {streamingReasoning && (
                <div
                  style={{
                    background: '#fff3e0',
                    border: '1px solid #ffcc80',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '4px',
                    fontSize: '13px',
                    color: '#e65100',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Brain size={14} />
                    <span style={{ fontWeight: 'bold' }}>思考中...</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{streamingReasoning}</div>
                </div>
              )}
              {streamingContent && (
                <div
                  style={{
                    background: '#f5f5f5',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    borderBottomLeftRadius: '4px',
                    wordBreak: 'break-word',
                    lineHeight: '1.5',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {streamingContent}
                  <span style={{ animation: 'blink 1s infinite' }}>▊</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #e0e0e0',
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter发送, Shift+Enter换行)"
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              resize: 'none',
              minHeight: '40px',
              maxHeight: '120px',
              fontSize: '14px',
              lineHeight: '1.5',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            style={{
              padding: '10px',
              background: inputMessage.trim() && !isLoading ? '#1976d2' : '#e0e0e0',
              color: inputMessage.trim() && !isLoading ? '#fff' : '#999',
              border: 'none',
              borderRadius: '8px',
              cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ChatPanel;
