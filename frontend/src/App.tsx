/**
 * 思流图（ThinkFlowMap）主应用组件
 * 整合所有子组件，提供完整的思维导图和对话体验
 */

import { useState, useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import type { MindMap, Node } from './types';
import { mindmapApi, configApi } from './services/api';
import { Sidebar } from './components/Sidebar';
import { MindMapCanvas } from './components/MindMapCanvas';
import { ChatPanel } from './components/ChatPanel';
import './App.css';

/**
 * 主应用组件
 * 
 * @returns 应用组件
 */
function App() {
  // 状态管理
  const [mindmaps, setMindmaps] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    created_at: string;
    updated_at: string;
    node_count: number;
  }>>([]);
  const [currentMindmap, setCurrentMindmap] = useState<MindMap | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{ initialized: boolean; model?: string } | null>(null);

  // 获取思维导图列表
  const fetchMindmaps = useCallback(async () => {
    try {
      const result = await mindmapApi.list();
      if (result.success) {
        setMindmaps(result.data);
      }
    } catch (error) {
      console.error('获取思维导图列表失败:', error);
      setError('无法连接到服务器，请确保后端服务已启动');
    }
  }, []);

  // 获取AI状态
  const fetchAIStatus = useCallback(async () => {
    try {
      const result = await configApi.getAIStatus();
      if (result.success) {
        setAiStatus(result.data);
      }
    } catch (error) {
      console.error('获取AI状态失败:', error);
    }
  }, []);

  // 初始化
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchMindmaps(), fetchAIStatus()]);
      setIsLoading(false);
    };
    init();
  }, [fetchMindmaps, fetchAIStatus]);

  // 选择思维导图
  const handleMindmapSelect = useCallback(async (mindmapId: string) => {
    console.log('正在选择思维导图:', mindmapId);
    try {
      const result = await mindmapApi.get(mindmapId);
      console.log('获取思维导图结果:', result);
      if (result.success && result.data) {
        setCurrentMindmap(result.data);
        setSelectedNodeId(null);
        console.log('思维导图切换成功:', result.data.title);
      } else {
        console.error('获取思维导图数据无效:', result);
        alert('无法加载思维导图数据');
      }
    } catch (error) {
      console.error('获取思维导图失败:', error);
      alert('加载思维导图失败，请检查网络连接');
    }
  }, []);

  // 创建思维导图
  const handleMindmapCreate = useCallback((mindmap: MindMap) => {
    setMindmaps((prev) => [
      ...prev,
      {
        id: mindmap.id,
        title: mindmap.title,
        description: mindmap.description,
        created_at: mindmap.created_at,
        updated_at: mindmap.updated_at,
        node_count: Object.keys(mindmap.nodes).length,
      },
    ]);
    setCurrentMindmap(mindmap);
    setSelectedNodeId(null);
  }, []);

  // 删除思维导图
  const handleMindmapDelete = useCallback((mindmapId: string) => {
    setMindmaps((prev) => prev.filter((m) => m.id !== mindmapId));
    if (currentMindmap?.id === mindmapId) {
      setCurrentMindmap(null);
      setSelectedNodeId(null);
    }
  }, [currentMindmap]);

  // 更新思维导图
  const handleMindmapUpdate = useCallback((updatedMindmap: MindMap) => {
    setCurrentMindmap(updatedMindmap);
    // 更新列表中的节点数
    setMindmaps((prev) =>
      prev.map((m) =>
        m.id === updatedMindmap.id
          ? { ...m, node_count: Object.keys(updatedMindmap.nodes).length }
          : m
      )
    );
  }, []);

  // 选择节点
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  // 更新节点
  const handleNodeUpdate = useCallback((updatedNode: Node) => {
    if (currentMindmap) {
      currentMindmap.nodes[updatedNode.id] = updatedNode;
      setCurrentMindmap({ ...currentMindmap });
    }
  }, [currentMindmap]);

  // 获取选中的节点
  const selectedNode = selectedNodeId && currentMindmap
    ? currentMindmap.nodes[selectedNodeId]
    : null;

  // 加载中
  if (isLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e0e0e0',
              borderTopColor: '#1976d2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#666' }}>加载中...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            textAlign: 'center',
            maxWidth: '400px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: '#ffebee',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span style={{ fontSize: '32px' }}>⚠️</span>
          </div>
          <h2 style={{ margin: '0 0 8px 0', color: '#333' }}>连接失败</h2>
          <p style={{ color: '#666', marginBottom: '16px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* 侧边栏 */}
      <Sidebar
        mindmaps={mindmaps}
        currentMindmapId={currentMindmap?.id || null}
        onMindmapSelect={handleMindmapSelect}
        onMindmapCreate={handleMindmapCreate}
        onMindmapDelete={handleMindmapDelete}
        onRefresh={fetchMindmaps}
      />

      {/* 主内容区 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 顶部栏 */}
        <div
          style={{
            height: '56px',
            background: '#fff',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}
        >
          <div>
            {currentMindmap ? (
              <>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#333',
                  }}
                >
                  {currentMindmap.title}
                </h1>
                {currentMindmap.description && (
                  <p
                    style={{
                      margin: '2px 0 0 0',
                      fontSize: '12px',
                      color: '#666',
                    }}
                  >
                    {currentMindmap.description}
                  </p>
                )}
              </>
            ) : (
              <h1
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#999',
                }}
              >
                请选择一个思维导图
              </h1>
            )}
          </div>

          {/* AI状态指示器 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: aiStatus?.initialized ? '#e8f5e9' : '#ffebee',
              borderRadius: '16px',
              fontSize: '12px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: aiStatus?.initialized ? '#4caf50' : '#f44336',
              }}
            />
            <span style={{ color: aiStatus?.initialized ? '#2e7d32' : '#c62828' }}>
              {aiStatus?.initialized ? 'AI已就绪' : 'AI未配置'}
            </span>
          </div>
        </div>

        {/* 工作区 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {/* 思维导图画布 */}
          <div
            style={{
              flex: currentMindmap ? 1.5 : 1,
              height: '100%',
              background: '#fafafa',
            }}
          >
            {currentMindmap ? (
              <ReactFlowProvider>
                <MindMapCanvas
                  mindmap={currentMindmap}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={handleNodeSelect}
                  onMindmapUpdate={handleMindmapUpdate}
                />
              </ReactFlowProvider>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                }}
              >
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    background: '#e3f2fd',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                  }}
                >
                  <span style={{ fontSize: '48px' }}>🧠</span>
                </div>
                <h2 style={{ margin: '0 0 8px 0', color: '#333' }}>
                  欢迎使用思流图
                </h2>
                <p style={{ margin: 0, color: '#666', textAlign: 'center', maxWidth: '400px' }}>
                  思流图是一个对话驱动的结构化思维导图系统。
                  从左侧创建一个新的思维导图开始吧！
                </p>
              </div>
            )}
          </div>

          {/* 对话面板 */}
          {currentMindmap && (
            <div
              style={{
                width: '380px',
                height: '100%',
                borderLeft: '1px solid #e0e0e0',
                background: '#fff',
              }}
            >
              <ChatPanel
                mindmap={currentMindmap}
                selectedNode={selectedNode}
                onNodeUpdate={handleNodeUpdate}
                onNodeSelect={handleNodeSelect}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
