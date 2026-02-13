import React, { useState, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  MarkerType, 
  useNodesState, 
  useEdgesState
} from '@xyflow/react';
import type { Connection, Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, MessageSquare, Edit3, Link2, Layers, Trash2, Undo2, Redo2, GitBranch, LayoutGrid, Maximize2, Minimize2 } from 'lucide-react';
import { useAppStore, RELATION_TYPE_LABELS } from '../../stores/appStore';
import NodeEditor from '../Node/NodeEditor';
import RelationEditor from '../Node/RelationEditor';
import CompositeNodeCreator from '../Node/CompositeNodeCreator';
import TestEdges from './TestEdges';

interface CustomNodeData extends Record<string, unknown> {
  label: string; 
  summary?: string;
  isRoot?: boolean;
  isComposite?: boolean;
  isExpanded?: boolean;
  childCount?: number;
  conversationId?: string | null;
  messageCount?: number;
  onExpand?: () => void;
}

type CustomNodeType = Node<CustomNodeData>;

/**
 * 自定义节点组件
 */
const CustomNode: React.FC<NodeProps<CustomNodeType>> = ({ data, selected }) => {
  const nodeData = data as CustomNodeData;
  
  return (
    <div
      className={`px-4 py-3 rounded-xl shadow-lg border-2 min-w-[160px] max-w-[280px] cursor-pointer transition-all ${
        selected
          ? 'bg-primary-600 border-primary-400 shadow-primary-500/20'
          : nodeData.isComposite && nodeData.isExpanded
            ? 'bg-primary-700/80 border-primary-400 shadow-primary-500/30'
            : nodeData.isRoot 
              ? 'bg-dark-700 border-primary-500/50 hover:border-primary-400'
              : 'bg-dark-700 border-dark-600 hover:border-primary-500'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {nodeData.isComposite ? (
          <Layers className={`w-4 h-4 ${nodeData.isExpanded ? 'text-primary-300' : 'text-primary-400'}`} />
        ) : nodeData.isRoot ? (
          <GitBranch className="w-4 h-4 text-primary-400" />
        ) : (
          <MessageSquare className="w-4 h-4 text-primary-400" />
        )}
        <span className="text-white font-medium truncate flex-1">{nodeData.label}</span>
        {nodeData.messageCount !== undefined && nodeData.messageCount > 0 && (
          <span className="text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-full">
            {nodeData.messageCount}
          </span>
        )}
      </div>
      {nodeData.summary && (
        <p className="text-xs text-dark-300 truncate">{nodeData.summary}</p>
      )}
      {nodeData.isComposite && (
        <div className="flex items-center justify-between mt-2">
          <p className={`text-xs ${nodeData.isExpanded ? 'text-primary-300' : 'text-primary-400'}`}>
            {nodeData.isExpanded ? '已展开' : `包含 ${nodeData.childCount} 个节点`}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onExpand?.();
            }}
            className={`p-1 rounded transition-colors ${
              nodeData.isExpanded 
                ? 'text-primary-300 hover:text-primary-200 hover:bg-primary-500/20' 
                : 'text-primary-400 hover:text-primary-300 hover:bg-primary-600/20'
            }`}
            title={nodeData.isExpanded ? '折叠节点' : '展开节点'}
          >
            {nodeData.isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
      {nodeData.isRoot && (
        <p className="text-xs text-primary-400/70 mt-1">根节点</p>
      )}
    </div>
  );
};

/**
 * 思维画布组件
 */
const CanvasPage: React.FC = () => {
  const { 
    nodes: storeNodes, 
    relations, 
    createRootNode,
    createChildNode,
    updateNode, 
    deleteNode, 
    selectNode, 
    selectedNodeId,
    undo,
    redo,
    history,
    historyIndex,
    expandCompositeNode,
    autoLayout,
    conversations
  } = useAppStore();
  
  // nodesArray 用于检测节点变化
  const nodesArray = React.useMemo(() => Array.from(storeNodes.values()), [storeNodes]);
  // relations 已经是数组，直接使用
  
  const [isNodeEditorOpen, setIsNodeEditorOpen] = useState(false);
  const [isRelationEditorOpen, setIsRelationEditorOpen] = useState(false);
  const [isCompositeCreatorOpen, setIsCompositeCreatorOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectedForComposite, setSelectedForComposite] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{ source: string; target: string } | null>(null);
  const [testMode, setTestMode] = useState(false);

  // 转换store节点为ReactFlow节点
  const initialNodes: Node[] = useMemo(() => {
    return nodesArray
      .filter((node) => !node.hidden)
      .map((node) => {
        const conversation = node.conversationId ? conversations.get(node.conversationId) : null;
        return {
          id: node.id,
          type: 'custom',
          position: node.position,
          data: {
            label: node.title,
            summary: node.summary,
            isRoot: node.isRoot,
            isComposite: node.isComposite,
            isExpanded: node.expanded,
            childCount: node.compositeChildren?.length,
            conversationId: node.conversationId,
            messageCount: conversation?.messages.length || 0,
            onExpand: node.isComposite ? () => expandCompositeNode(node.id) : undefined
          }
        };
      });
  }, [nodesArray, conversations, expandCompositeNode]);

  // 转换关系为边 - 只显示可见节点之间的边
  const initialEdges: Edge[] = useMemo(() => {
    console.log('=== Computing initialEdges ===');
    console.log('relations:', relations);
    console.log('relations type:', typeof relations, Array.isArray(relations));
    
    if (!relations || !Array.isArray(relations)) {
      console.log('No relations or not array, returning empty');
      return [];
    }
    
    console.log('relations length:', relations.length);
    
    const visibleNodeIds = new Set(nodesArray.filter(n => !n.hidden).map(n => n.id));
    console.log('visibleNodeIds:', Array.from(visibleNodeIds));
    
    // 收集展开的聚合节点及其子节点
    const expandedCompositeNodes = nodesArray.filter(n => n.isComposite && n.expanded && n.compositeChildren);
    
    // 创建普通关系边
    const relationEdges = relations.map((relation) => {
      console.log('Processing relation:', relation);
      
      if (!relation || typeof relation !== 'object') {
        console.log('Invalid relation object');
        return null;
      }
      if (!relation.type || !relation.id || !relation.sourceId || !relation.targetId) {
        console.log('Missing required fields:', relation);
        return null;
      }
      
      if (!visibleNodeIds.has(relation.sourceId) || !visibleNodeIds.has(relation.targetId)) {
        console.log('Source or target not visible:', relation.sourceId, relation.targetId);
        return null;
      }
      
      const colorMap: Record<string, string> = {
        'parent-child': '#22c55e',
        'supports': '#22c55e',
        'contradicts': '#ef4444',
        'prerequisite': '#f59e0b',
        'elaborates': '#3b82f6',
        'references': '#a855f7',
        'conclusion': '#06b6d4',
        'custom': '#eab308'
      };
      
      const color = colorMap[relation.type] || '#eab308';
      const isParentChild = relation.type === 'parent-child';
      
      const edge: Edge = {
        id: relation.id,
        source: relation.sourceId,
        target: relation.targetId,
        type: 'smoothstep',
        style: { 
          stroke: color, 
          strokeWidth: 2 
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color
        }
      };
      
      if (!isParentChild) {
        edge.label = RELATION_TYPE_LABELS[relation.type]?.label;
        edge.labelStyle = { fill: '#fff', fontSize: 10, fontWeight: 500 };
        edge.labelBgStyle = { fill: color, fillOpacity: 0.9 };
        edge.labelBgPadding = [4, 2] as [number, number];
      }
      
      console.log('Created edge:', edge);
      return edge;
    }).filter(Boolean) as Edge[];
    
    // 创建聚合节点到子节点的分支连接线
    const compositeEdges: Edge[] = [];
    expandedCompositeNodes.forEach(compositeNode => {
      if (compositeNode.compositeChildren) {
        compositeNode.compositeChildren.forEach(childId => {
          if (visibleNodeIds.has(childId)) {
            compositeEdges.push({
              id: `composite-${compositeNode.id}-${childId}`,
              source: compositeNode.id,
              target: childId,
              style: { 
                stroke: '#8b5cf6', 
                strokeWidth: 2,
                strokeDasharray: '5,5'
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#8b5cf6'
              }
            });
          }
        });
      }
    });
    
    const allEdges = [...relationEdges, ...compositeEdges];
    
    console.log('Final edges count:', allEdges.length, '(relations:', relationEdges.length, ', composite:', compositeEdges.length, ')');
    console.log('=== End initialEdges ===');
    
    return allEdges;
  }, [relations, nodesArray]);

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // 调试：打印 edges 变化
  React.useEffect(() => {
    console.log('edges changed:', edges.length, edges);
  }, [edges]);

  // 同步store变化到ReactFlow
  React.useEffect(() => {
    console.log('Syncing initialNodes to ReactFlow:', initialNodes.length);
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    console.log('Syncing initialEdges to ReactFlow:', initialEdges.length, initialEdges);
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // 检查 DOM 中的边
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const edgeElements = document.querySelectorAll('.react-flow__edge');
      const edgePaths = document.querySelectorAll('.react-flow__edge-path');
      const svgContainer = document.querySelector('.react-flow__edges');
      const viewport = document.querySelector('.react-flow__viewport');
      
      console.log('=== DOM STRUCTURE ===');
      console.log('viewport:', viewport);
      console.log('svg edges container:', svgContainer);
      console.log('DOM check - edge elements:', edgeElements.length);
      console.log('DOM check - edge paths:', edgePaths.length);
      
      // 检查 SVG 容器的样式
      if (svgContainer) {
        const styles = window.getComputedStyle(svgContainer);
        console.log('SVG container styles:', {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          position: styles.position,
          zIndex: styles.zIndex
        });
      }
      
      if (edgePaths.length > 0) {
        edgePaths.forEach((path, i) => {
          const d = path.getAttribute('d');
          const stroke = path.getAttribute('stroke') || (path as SVGElement).style.stroke;
          console.log(`Edge path ${i}: d=${d?.substring(0, 50)}..., stroke=${stroke}`);
        });
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [edges]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  /**
   * 调试：打印当前状态
   */
  const debugState = useCallback(() => {
    console.log('=== DEBUG STATE ===');
    console.log('storeNodes size:', storeNodes.size);
    
    // 详细检查节点
    console.log('=== NODES DETAIL ===');
    nodesArray.forEach((n, i) => {
      console.log(`Node ${i}: id=${n.id}, title=${n.title}, hidden=${n.hidden}, position=(${n.position.x}, ${n.position.y})`);
    });
    
    // 详细检查关系
    console.log('=== RELATIONS DETAIL ===');
    relations.forEach((r, i) => {
      console.log(`Relation ${i}: id=${r.id}, source=${r.sourceId}, target=${r.targetId}, type=${r.type}`);
    });
    
    // 检查每条边的节点可见性
    const visibleNodeIds = new Set(nodesArray.filter(n => !n.hidden).map(n => n.id));
    console.log('Visible Node IDs:', Array.from(visibleNodeIds));
    
    console.log('=== EDGE VISIBILITY ===');
    relations.forEach((r, i) => {
      const sourceVisible = visibleNodeIds.has(r.sourceId);
      const targetVisible = visibleNodeIds.has(r.targetId);
      console.log(`Relation ${i}: source=${r.sourceId}(${sourceVisible}), target=${r.targetId}(${targetVisible}), willShow=${sourceVisible && targetVisible}`);
    });
    
    console.log('initialNodes count:', initialNodes.length);
    console.log('initialEdges count:', initialEdges.length);
    
    // 详细检查每条边
    console.log('=== INITIAL EDGES ===');
    initialEdges.forEach((e, i) => {
      console.log(`Edge ${i}:`, JSON.stringify(e, null, 2));
    });
    
    // 检查 ReactFlow 状态
    console.log('=== REACTFLOW STATE ===');
    console.log('ReactFlow nodes count:', nodes.length);
    console.log('ReactFlow edges count:', edges.length);
    
    // 检查节点 ID 是否匹配
    const nodeIds = new Set(nodes.map(n => n.id));
    console.log('ReactFlow Node IDs:', Array.from(nodeIds));
    
    edges.forEach((e, i) => {
      const sourceExists = nodeIds.has(e.source);
      const targetExists = nodeIds.has(e.target);
      console.log(`Edge ${i}: source=${e.source}(${sourceExists}), target=${e.target}(${targetExists})`);
    });
    
    // 检查 DOM 中的边元素
    setTimeout(() => {
      const edgePaths = document.querySelectorAll('.react-flow__edge-path');
      console.log('DOM edge-path elements:', edgePaths.length);
      edgePaths.forEach((path, i) => {
        const d = path.getAttribute('d');
        const stroke = window.getComputedStyle(path).stroke;
        console.log(`Edge path ${i}: d=${d?.substring(0, 50)}..., stroke=${stroke}`);
      });
    }, 100);
    
    console.log('=== END DEBUG ===');
  }, [storeNodes, relations, nodesArray, initialNodes, initialEdges, nodes, edges]);

  /**
   * 清除存储并刷新
   */
  const clearStorage = useCallback(() => {
    if (confirm('确定要清除所有数据吗？这将删除所有节点和关系。')) {
      localStorage.removeItem('deep-mind-map-storage');
      window.location.reload();
    }
  }, []);

  /**
   * 修复隐藏节点 - 重置所有节点的 hidden 状态
   */
  const fixHiddenNodes = useCallback(() => {
    const { nodes, updateNode } = useAppStore.getState();
    let fixedCount = 0;
    
    nodes.forEach((node, id) => {
      if (node.hidden || node.compositeParent) {
        updateNode(id, { hidden: false, compositeParent: undefined });
        fixedCount++;
      }
    });
    
    console.log(`Fixed ${fixedCount} hidden nodes`);
    alert(`已修复 ${fixedCount} 个隐藏节点，请刷新页面查看效果`);
  }, []);

  /**
   * 连接节点 - 创建关系
   */
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setPendingConnection({ source: params.source, target: params.target });
        setIsRelationEditorOpen(true);
      }
    },
    []
  );

  /**
   * 创建根节点
   */
  const handleCreateRootNode = useCallback(() => {
    const id = createRootNode('新对话');
    setEditingNodeId(id);
    setIsNodeEditorOpen(true);
  }, [createRootNode]);

  /**
   * 创建子节点
   */
  const handleCreateChildNode = useCallback(() => {
    if (!selectedNodeId) {
      alert('请先选择一个父节点');
      return;
    }
    
    const id = createChildNode(selectedNodeId, '新分支');
    setEditingNodeId(id);
    setIsNodeEditorOpen(true);
  }, [selectedNodeId, createChildNode]);

  /**
   * 节点点击
   */
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (isSelectMode) {
        setSelectedForComposite(prev => {
          if (prev.includes(node.id)) {
            return prev.filter(id => id !== node.id);
          }
          return [...prev, node.id];
        });
      } else {
        selectNode(node.id);
      }
    },
    [selectNode, isSelectMode]
  );

  /**
   * 节点双击 - 编辑或展开
   */
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const storeNode = storeNodes.get(node.id);
      if (storeNode?.isComposite) {
        expandCompositeNode(node.id);
      } else {
        setEditingNodeId(node.id);
        setIsNodeEditorOpen(true);
      }
    },
    [storeNodes, expandCompositeNode]
  );

  /**
   * 节点拖拽结束
   */
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updateNode(node.id, { position: node.position });
    },
    [updateNode]
  );

  /**
   * 切换多选模式
   */
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedForComposite([]);
    }
  };

  /**
   * 创建复合节点
   */
  const handleCreateComposite = () => {
    if (selectedForComposite.length >= 2) {
      setIsCompositeCreatorOpen(true);
    }
  };

  /**
   * 删除选中节点
   */
  const handleDeleteNode = () => {
    if (selectedNodeId && confirm('确定要删除此节点及其所有子节点吗？')) {
      deleteNode(selectedNodeId);
    }
  };

  return (
    <div className="h-full bg-dark-950 relative">
      {/* 测试模式 */}
      {testMode && (
        <div className="absolute inset-0 z-50 bg-dark-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-white text-lg font-bold">ReactFlow 边测试</h2>
            <button
              onClick={() => setTestMode(false)}
              className="px-4 py-2 bg-red-600 rounded-lg text-white"
            >
              关闭测试
            </button>
          </div>
          <TestEdges />
        </div>
      )}
      
      {/* 工具栏 */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
        {/* 创建节点按钮 */}
        <button
          onClick={handleCreateRootNode}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 border border-primary-500 rounded-xl text-white hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"
          title="创建根节点（新对话起点）"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">创建对话</span>
        </button>
        
        {/* 创建子节点按钮 */}
        {selectedNodeId && (
          <button
            onClick={handleCreateChildNode}
            className="flex items-center gap-2 px-3 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-white hover:bg-dark-600 hover:border-primary-500/50 transition-all"
            title="创建分支节点"
          >
            <GitBranch className="w-4 h-4" />
            <span className="text-sm">创建分支</span>
          </button>
        )}
        
        <div className="w-px bg-dark-600 h-10" />
        
        {/* 撤销/重做 */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2.5 bg-dark-700 border border-dark-600 rounded-xl text-white hover:bg-dark-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2.5 bg-dark-700 border border-dark-600 rounded-xl text-white hover:bg-dark-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="重做 (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        
        <div className="w-px bg-dark-600 h-10" />
        
        {/* 编辑/删除 */}
        <button
          onClick={() => {
            setEditingNodeId(selectedNodeId);
            setIsNodeEditorOpen(true);
          }}
          disabled={!selectedNodeId}
          className="p-2.5 bg-dark-700 border border-dark-600 rounded-xl text-white hover:bg-dark-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="编辑节点"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsRelationEditorOpen(true)}
          className="p-2.5 bg-dark-700 border border-dark-600 rounded-xl text-white hover:bg-dark-600 transition-all"
          title="创建关系"
        >
          <Link2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDeleteNode}
          disabled={!selectedNodeId}
          className="p-2.5 bg-dark-700 border border-dark-600 rounded-xl text-red-400 hover:bg-red-900/30 hover:border-red-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="删除节点"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        
        <div className="w-px bg-dark-600 h-10" />
        
        {/* 多选/聚合 */}
        <button
          onClick={toggleSelectMode}
          className={`p-2.5 border rounded-xl transition-all ${
            isSelectMode 
              ? 'bg-primary-600 border-primary-500 text-white' 
              : 'bg-dark-700 border-dark-600 text-white hover:bg-dark-600'
          }`}
          title="多选模式（用于聚合节点）"
        >
          <Layers className="w-4 h-4" />
        </button>
        {isSelectMode && selectedForComposite.length >= 2 && (
          <button
            onClick={handleCreateComposite}
            className="flex items-center gap-2 px-3 py-2.5 bg-primary-600 border border-primary-500 rounded-xl text-white hover:bg-primary-700 transition-all"
          >
            <Layers className="w-4 h-4" />
            <span className="text-sm">聚合 ({selectedForComposite.length})</span>
          </button>
        )}
        
        {/* 自动布局 */}
        <button
          onClick={autoLayout}
          className="p-2.5 bg-dark-700 border border-dark-600 rounded-xl text-white hover:bg-dark-600 transition-all"
          title="自动布局"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        
        <div className="w-px bg-dark-600 h-10" />
        
        {/* 调试按钮 */}
        <button
          onClick={() => setTestMode(!testMode)}
          className={`px-3 py-2.5 rounded-xl transition-all text-xs ${
            testMode 
              ? 'bg-green-600 border border-green-500 text-white' 
              : 'bg-gray-600/20 border border-gray-500/50 text-gray-400'
          }`}
          title="切换测试模式"
        >
          {testMode ? '测试中' : '测试边'}
        </button>
        <button
          onClick={debugState}
          className="px-3 py-2.5 bg-yellow-600/20 border border-yellow-500/50 rounded-xl text-yellow-400 hover:bg-yellow-600/30 transition-all text-xs"
          title="打印调试信息到控制台"
        >
          调试
        </button>
        <button
          onClick={fixHiddenNodes}
          className="px-3 py-2.5 bg-blue-600/20 border border-blue-500/50 rounded-xl text-blue-400 hover:bg-blue-600/30 transition-all text-xs"
          title="修复隐藏的节点"
        >
          修复节点
        </button>
        <button
          onClick={clearStorage}
          className="px-3 py-2.5 bg-red-600/20 border border-red-500/50 rounded-xl text-red-400 hover:bg-red-600/30 transition-all text-xs"
          title="清除所有数据"
        >
          清除数据
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={{ custom: CustomNode }}
        fitView
      >
        <Background color="#334155" gap={20} />
        <Controls className="bg-dark-800 border-dark-700 rounded-xl overflow-hidden [&>button]:bg-dark-700 [&>button]:border-dark-600 [&>button]:text-white [&>button:hover]:bg-dark-600" />
        <MiniMap
          className="bg-dark-800 border-dark-700 rounded-xl overflow-hidden"
          nodeColor={(node) => {
            const data = node.data as any;
            if (data?.isRoot) return '#0ea5e9';
            if (data?.isComposite) return '#8b5cf6';
            return '#475569';
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
        />
      </ReactFlow>
      
      {/* 空状态提示 */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-2xl shadow-primary-600/30">
              <MessageSquare className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              开始构建你的思维网络
            </h2>
            <p className="text-dark-400 mb-6 max-w-md">
              创建对话节点，通过分支展开新的讨论方向，<br />
              构建属于你的非线性思维导图
            </p>
            <button
              onClick={handleCreateRootNode}
              className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-primary-600 rounded-xl text-white hover:bg-primary-700 transition-all mx-auto shadow-lg shadow-primary-600/30"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">创建第一个对话</span>
            </button>
          </div>
        </div>
      )}

      {/* 工具提示 */}
      <div className="absolute bottom-4 left-4 text-dark-500 text-xs bg-dark-800/80 px-3 py-2 rounded-lg backdrop-blur-sm">
        <span className="text-dark-400">点击「创建对话」添加根节点</span>
        <span className="mx-2">•</span>
        <span className="text-dark-400">选中节点后可创建分支</span>
        <span className="mx-2">•</span>
        <span className="text-dark-400">双击节点编辑</span>
        {isSelectMode && <span className="ml-2 text-primary-400">• 多选模式已开启</span>}
      </div>

      {/* 节点编辑器 */}
      <NodeEditor
        nodeId={editingNodeId || selectedNodeId}
        isOpen={isNodeEditorOpen}
        onClose={() => {
          setIsNodeEditorOpen(false);
          setEditingNodeId(null);
        }}
        allNodes={storeNodes}
      />

      {/* 关系编辑器 */}
      <RelationEditor
        isOpen={isRelationEditorOpen}
        onClose={() => {
          setIsRelationEditorOpen(false);
          setPendingConnection(null);
        }}
        sourceNodeId={pendingConnection?.source}
        targetNodeId={pendingConnection?.target}
        allNodes={storeNodes}
      />

      {/* 复合节点创建器 */}
      <CompositeNodeCreator
        isOpen={isCompositeCreatorOpen}
        onClose={() => {
          setIsCompositeCreatorOpen(false);
          setSelectedForComposite([]);
          setIsSelectMode(false);
        }}
        selectedNodeIds={selectedForComposite}
        allNodes={storeNodes}
      />
    </div>
  );
};

export default CanvasPage;
