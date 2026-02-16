/**
 * 思维导图画布组件
 * 使用ReactFlow实现思维导图的可视化展示和交互
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge as FlowEdge,
  type Node as FlowNode,
  Panel,
  useReactFlow,
  ConnectionMode,
  type NodeTypes,
  MarkerType,
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { MindMap, Node, Edge, NodeColor } from '../types';
import MindMapNodeComponent from './MindMapNode';
import { nodeApi, edgeApi } from '../services/api';

/**
 * 自定义关系边组件
 * 显示带有标签和箭头的连接线
 */
const RelationEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeColor = (style as React.CSSProperties).stroke as string || '#999';
  const strokeWidth = (style as React.CSSProperties).strokeWidth as number || 2;
  const strokeDasharray = (style as React.CSSProperties).strokeDasharray as string | undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth: strokeWidth,
          strokeDasharray: strokeDasharray,
        }}
      />
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-30}
            y={-10}
            width={60}
            height={20}
            rx={4}
            fill={edgeColor}
            opacity={0.9}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={11}
            fontWeight={500}
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
};

// 节点类型映射
const nodeTypes: NodeTypes = {
  mindmap: MindMapNodeComponent,
};

// 边类型映射
const edgeTypes: EdgeTypes = {
  smoothstep: RelationEdge,
  relation: RelationEdge,
};

// 节点颜色映射
const colorMap: Record<NodeColor, string> = {
  '#ffffff': '#ffffff',
  '#e3f2fd': '#e3f2fd',
  '#e8f5e9': '#e8f5e9',
  '#fffde7': '#fffde7',
  '#ffebee': '#ffebee',
  '#f3e5f5': '#f3e5f5',
  '#fff3e0': '#fff3e0',
};

interface MindMapCanvasProps {
  mindmap: MindMap;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onMindmapUpdate: (mindmap: MindMap) => void;
}

/**
 * 将后端节点转换为ReactFlow节点格式
 * 
 * @param node - 后端节点数据
 * @param isSelected - 是否被选中
 * @param isInheritanceRelated - 是否与继承关系相关（父节点或子节点）
 * @param onRename - 重命名回调函数
 * @returns ReactFlow节点
 */
function convertToFlowNode(
  node: Node, 
  isSelected: boolean, 
  isInheritanceRelated: boolean = false,
  onRename?: (nodeId: string, newTitle: string) => void
): FlowNode {
  // 继承关系相关节点的特殊样式
  const inheritanceStyle = isInheritanceRelated ? {
    boxShadow: '0 0 0 3px #ff6f00, 0 4px 12px rgba(255, 111, 0, 0.3)',
    background: '#fff8e1',  // 浅橙色背景
  } : {};

  return {
    id: node.id,
    type: 'mindmap',
    position: { x: node.position_x, y: node.position_y },
    data: {
      ...node,
      isSelected,
      isInheritanceRelated,
      onRename,
    },
    style: {
      background: isInheritanceRelated ? '#fff8e1' : (colorMap[node.color] || '#ffffff'),
      border: isSelected ? '3px solid #1976d2' : (isInheritanceRelated ? '2px solid #ff6f00' : '1px solid #ccc'),
      borderRadius: '8px',
      padding: '10px',
      minWidth: '150px',
      maxWidth: '250px',
      ...inheritanceStyle,
    },
  };
}

/**
 * 将后端关系线转换为ReactFlow边格式
 * 
 * @param edge - 后端关系线数据
 * @param isHighlighted - 是否高亮显示（继承关系）
 * @returns ReactFlow边
 */
function convertToFlowEdge(edge: Edge, isHighlighted: boolean = false): FlowEdge {
  const edgeStyles: Record<string, { stroke: string; strokeDasharray?: string; strokeWidth?: number }> = {
    dependency: { stroke: '#f44336', strokeWidth: 2 },
    reference: { stroke: '#2196f3', strokeWidth: 2 },
    extension: { stroke: '#4caf50', strokeDasharray: '5,5', strokeWidth: 2 },
    parent_child: { stroke: '#22c55e', strokeWidth: 2 },
  };

  const baseStyle = edgeStyles[edge.relation_type] || { stroke: '#999', strokeWidth: 2 };
  
  const highlightedStyle = isHighlighted ? {
    stroke: '#ff6f00',
    strokeWidth: 4,
    strokeDasharray: edge.relation_type === 'extension' ? '5,5' : undefined,
  } : baseStyle;

  const edgeColor = isHighlighted ? '#ff6f00' : baseStyle.stroke;

  return {
    id: edge.id,
    source: edge.source_id,
    target: edge.target_id,
    type: 'smoothstep',
    animated: isHighlighted || edge.relation_type === 'dependency',
    style: highlightedStyle,
    label: edge.label,
    labelStyle: { 
      fill: isHighlighted ? '#ff6f00' : '#666', 
      fontSize: isHighlighted ? 14 : 12,
      fontWeight: isHighlighted ? 'bold' : 'normal',
    },
    labelBgStyle: { 
      fill: edgeColor, 
      fillOpacity: 0.9 
    },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: edgeColor,
      width: 20,
      height: 20,
    },
  };
}

/**
 * 获取节点的直接父节点ID（不递归）
 * 包括显式parent_ids和通过PARENT_CHILD边连接的父节点
 * 
 * @param mindmap - 思维导图数据
 * @param nodeId - 节点ID
 * @returns 父节点ID集合
 */
function getDirectParentIds(mindmap: MindMap, nodeId: string): Set<string> {
  const parentIds = new Set<string>();
  const node = mindmap.nodes[nodeId];
  
  if (!node) return parentIds;
  
  // 添加显式parent_ids
  node.parent_ids.forEach(id => parentIds.add(id));
  
  // 查找通过PARENT_CHILD关系线连接的父节点
  Object.values(mindmap.edges).forEach(edge => {
    if (edge.relation_type === 'parent_child') {
      if (edge.target_id === nodeId) {
        // source -> target 是父节点指向子节点
        parentIds.add(edge.source_id);
      } else if (edge.source_id === nodeId && edge.is_bidirectional) {
        // 双向关系时，target也是父节点
        parentIds.add(edge.target_id);
      }
    }
  });
  
  return parentIds;
}

/**
 * 递归获取所有继承祖先节点ID（包括根节点）
 * 
 * @param mindmap - 思维导图数据
 * @param nodeId - 起始节点ID
 * @param visited - 已访问节点集合（防止循环）
 * @returns 所有祖先节点ID集合
 */
function getAllInheritanceAncestors(
  mindmap: MindMap, 
  nodeId: string, 
  visited: Set<string> = new Set()
): Set<string> {
  const ancestors = new Set<string>();
  
  // 防止循环
  if (visited.has(nodeId)) return ancestors;
  visited.add(nodeId);
  
  // 获取直接父节点
  const directParents = getDirectParentIds(mindmap, nodeId);
  
  // 递归获取每个父节点的祖先
  directParents.forEach(parentId => {
    if (mindmap.nodes[parentId]) {
      ancestors.add(parentId);
      const parentAncestors = getAllInheritanceAncestors(mindmap, parentId, visited);
      parentAncestors.forEach(id => ancestors.add(id));
    }
  });
  
  return ancestors;
}

/**
 * 获取节点的所有子节点ID（通过父子关系）
 * 
 * @param mindmap - 思维导图数据
 * @param nodeId - 节点ID
 * @returns 子节点ID集合
 */
function getChildIds(mindmap: MindMap, nodeId: string): Set<string> {
  const childIds = new Set<string>();
  const node = mindmap.nodes[nodeId];
  
  if (!node) return childIds;
  
  // 添加显式child_ids
  node.child_ids.forEach(id => childIds.add(id));
  
  // 查找通过PARENT_CHILD关系线连接的子节点
  Object.values(mindmap.edges).forEach(edge => {
    if (edge.relation_type === 'parent_child') {
      if (edge.source_id === nodeId) {
        // source -> target 是父节点指向子节点
        childIds.add(edge.target_id);
      } else if (edge.target_id === nodeId && edge.is_bidirectional) {
        // 双向关系时，source也是子节点
        childIds.add(edge.source_id);
      }
    }
  });
  
  return childIds;
}

/**
 * 获取继承关系相关的所有边ID
 * 包括祖先链和后代链上的所有父子关系边
 * 
 * @param mindmap - 思维导图数据
 * @param nodeId - 当前节点ID
 * @param relatedNodeIds - 相关节点ID集合
 * @returns 继承关系边ID集合
 */
function getInheritanceEdgeIds(
  mindmap: MindMap, 
  nodeId: string, 
  relatedNodeIds: Set<string>
): Set<string> {
  const edgeIds = new Set<string>();
  
  // 包含当前节点
  const allRelatedIds = new Set([...relatedNodeIds, nodeId]);
  
  Object.values(mindmap.edges).forEach(edge => {
    if (edge.relation_type === 'parent_child') {
      // 高亮所有相关节点之间的父子关系线
      const sourceInSet = allRelatedIds.has(edge.source_id);
      const targetInSet = allRelatedIds.has(edge.target_id);
      
      // 如果边的两端都在相关节点集合中，则高亮
      if (sourceInSet && targetInSet) {
        edgeIds.add(edge.id);
      }
    }
  });
  
  return edgeIds;
}

/**
 * 获取与选中节点有继承关系的所有节点（用于汇总场景）
 * 包括：所有祖先节点 + 通过关系线直接连接到选中节点的其他父节点
 * 
 * @param mindmap - 思维导图数据
 * @param nodeId - 选中节点ID
 * @returns 相关节点信息
 */
function getInheritanceRelatedNodes(
  mindmap: MindMap, 
  nodeId: string
): {
  ancestors: Set<string>;      // 所有祖先节点
  directParents: Set<string>;  // 直接父节点
  children: Set<string>;       // 直接子节点
  allRelated: Set<string>;     // 所有相关节点
} {
  const ancestors = getAllInheritanceAncestors(mindmap, nodeId);
  const directParents = getDirectParentIds(mindmap, nodeId);
  const children = getChildIds(mindmap, nodeId);
  
  // 所有相关节点 = 祖先 + 直接父节点 + 子节点 + 当前节点
  const allRelated = new Set([...ancestors, ...directParents, ...children]);
  
  return { ancestors, directParents, children, allRelated };
}

// 节点高亮模式类型
 type HighlightMode = 'all' | 'ancestors' | 'direct_parents' | 'custom';
 
 export const MindMapCanvas = ({
   mindmap,
   selectedNodeId,
   onNodeSelect,
   onMindmapUpdate,
 }: MindMapCanvasProps) => {
   const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
   const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
   const [isConnecting, setIsConnecting] = useState(false);
   const [highlightMode, setHighlightMode] = useState<HighlightMode>('all');
   const [customHighlightedNodes, setCustomHighlightedNodes] = useState<Set<string>>(new Set());
   const [showHighlightPanel, setShowHighlightPanel] = useState(false);
   const { fitView, setCenter } = useReactFlow();
   const newlyCreatedNodeId = useRef<string | null>(null);
 
   // 同步思维导图数据到ReactFlow
   useEffect(() => {
     // 检查选中的节点是否属于当前思维导图
     const isValidSelection = selectedNodeId && mindmap.nodes[selectedNodeId];
     
     if (!isValidSelection) {
       // 没有选中节点或选中节点不属于当前思维导图时，正常显示所有节点
       const flowNodes = Object.values(mindmap.nodes).map((node) =>
         convertToFlowNode(node, false, false)
       );
       const flowEdges = Object.values(mindmap.edges).map((edge) =>
         convertToFlowEdge(edge, false)
       );
       setNodes(flowNodes);
       setEdges(flowEdges);
       return;
     }
 
     // 获取继承关系相关的节点信息
     const inheritanceInfo = getInheritanceRelatedNodes(mindmap, selectedNodeId!);
     
     // 根据高亮模式确定要显示的节点
     let nodesToHighlight = new Set<string>();
     
     switch (highlightMode) {
       case 'all':
         // 高亮所有相关节点：所有祖先 + 直接父节点 + 子节点
         nodesToHighlight = inheritanceInfo.allRelated;
         break;
       case 'ancestors':
         // 只高亮祖先链（包括根节点）
         nodesToHighlight = inheritanceInfo.ancestors;
         break;
       case 'direct_parents':
         // 只高亮直接父节点
         nodesToHighlight = inheritanceInfo.directParents;
         break;
       case 'custom':
         // 用户自定义选择的节点 + 当前选中节点
         nodesToHighlight = new Set([...customHighlightedNodes, selectedNodeId!]);
         break;
     }
     
     // 获取要高亮的边（包括所有相关节点之间的父子关系线）
     const inheritanceEdgeIds = getInheritanceEdgeIds(mindmap, selectedNodeId!, nodesToHighlight);
     
     const flowNodes = Object.values(mindmap.nodes).map((node) => {
      const isSelected = node.id === selectedNodeId;
      const isInheritanceRelated = !isSelected && nodesToHighlight.has(node.id);
      return convertToFlowNode(node, isSelected, isInheritanceRelated, handleNodeRename);
    });
     
     const flowEdges = Object.values(mindmap.edges).map((edge) => {
       const isHighlighted = inheritanceEdgeIds.has(edge.id);
       return convertToFlowEdge(edge, isHighlighted);
     });
     
     setNodes(flowNodes);
     setEdges(flowEdges);
     
     // 如果有新创建的节点，自动聚焦并选中
     if (newlyCreatedNodeId.current) {
       const newNode = mindmap.nodes[newlyCreatedNodeId.current];
       if (newNode) {
         // 延迟执行以确保节点已渲染
         setTimeout(() => {
           setCenter(newNode.position_x, newNode.position_y, { zoom: 1, duration: 500 });
           onNodeSelect(newlyCreatedNodeId.current);
           newlyCreatedNodeId.current = null;
         }, 100);
       }
     }
   }, [mindmap, selectedNodeId, highlightMode, customHighlightedNodes, setNodes, setEdges, setCenter, onNodeSelect]);

  // 处理节点点击
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      onNodeSelect(node.id === selectedNodeId ? null : node.id);
    },
    [onNodeSelect, selectedNodeId]
  );

  // 处理画布点击（取消选择）
  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // 处理节点拖拽结束
  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: FlowNode) => {
      try {
        await nodeApi.move(mindmap.id, node.id, node.position.x, node.position.y);
        // 更新本地状态
        const updatedNode = mindmap.nodes[node.id];
        if (updatedNode) {
          updatedNode.position_x = node.position.x;
          updatedNode.position_y = node.position.y;
          onMindmapUpdate({ ...mindmap });
        }
      } catch (error) {
        console.error('移动节点失败:', error);
      }
    },
    [mindmap, onMindmapUpdate]
  );

  // 处理连接（创建关系线）
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      try {
        const result = await edgeApi.create(mindmap.id, {
          source_id: connection.source,
          target_id: connection.target,
          relation_type: 'reference',
        });

        if (result.success) {
          const newEdge = convertToFlowEdge(result.data);
          setEdges((eds) => addEdge(newEdge, eds));
          
          // 更新思维导图数据
          mindmap.edges[result.data.id] = result.data;
          onMindmapUpdate({ ...mindmap });
        }
      } catch (error) {
        console.error('创建关系线失败:', error);
      }
      
      setIsConnecting(false);
    },
    [mindmap, onMindmapUpdate, setEdges]
  );

  // 处理连接开始
  const onConnectStart = useCallback(() => {
    setIsConnecting(true);
  }, []);

  // 处理连接结束
  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
  }, []);

  // 处理边点击（删除关系线）
  const onEdgeClick = useCallback(
    async (_: React.MouseEvent, edge: FlowEdge) => {
      if (confirm('确定要删除这条关系线吗？')) {
        try {
          await edgeApi.delete(mindmap.id, edge.id);
          setEdges((eds) => eds.filter((e) => e.id !== edge.id));
          
          // 更新思维导图数据
          delete mindmap.edges[edge.id];
          onMindmapUpdate({ ...mindmap });
        } catch (error) {
          console.error('删除关系线失败:', error);
        }
      }
    },
    [mindmap, onMindmapUpdate, setEdges]
  );

  // 创建根节点
  const handleCreateRootNode = useCallback(async () => {
    try {
      const existingNodes = Object.values(mindmap.nodes);
      const positionX = existingNodes.length > 0 
        ? Math.max(...existingNodes.map(n => n.position_x)) + 300 
        : 100;
      const positionY = existingNodes.length > 0 
        ? Math.min(...existingNodes.map(n => n.position_y)) 
        : 300;

      const result = await nodeApi.create(mindmap.id, {
        title: '根节点',
        node_type: 'root',
        position_x: positionX,
        position_y: positionY,
      });

      if (result.success) {
        mindmap.nodes[result.data.id] = result.data;
        onMindmapUpdate({ ...mindmap });
        newlyCreatedNodeId.current = result.data.id;
      }
    } catch (error) {
      console.error('创建根节点失败:', error);
    }
  }, [mindmap, onMindmapUpdate]);

  // 添加子节点 - 自动生成默认关系线
  const handleAddChildNode = useCallback(
    async (parentId: string) => {
      if (!selectedNodeId) return;

      const parentNode = mindmap.nodes[parentId];
      if (!parentNode) return;

      try {
        // 1. 创建子节点
        const nodeResult = await nodeApi.create(mindmap.id, {
          title: '新节点',
          parent_id: parentId,
          position_x: parentNode.position_x + 250,
          position_y: parentNode.position_y + (parentNode.child_ids.length * 100),
        });

        if (nodeResult.success) {
          const newNode = nodeResult.data;
          
          // 2. 自动创建默认关系线（父子关系）
          const edgeResult = await edgeApi.create(mindmap.id, {
            source_id: parentId,
            target_id: newNode.id,
            relation_type: 'parent_child',
            label: '子节点',
          });

          if (edgeResult.success) {
            mindmap.edges[edgeResult.data.id] = edgeResult.data;
          }
          
          // 3. 更新思维导图数据
          mindmap.nodes[newNode.id] = newNode;
          onMindmapUpdate({ ...mindmap });
          
          // 4. 标记新节点以获得焦点
          newlyCreatedNodeId.current = newNode.id;
        }
      } catch (error) {
        console.error('创建节点失败:', error);
      }
    },
    [mindmap, onMindmapUpdate, selectedNodeId]
  );

  // 删除节点
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      if (!confirm('确定要删除这个节点吗？相关的子节点也会被删除。')) return;

      try {
        await nodeApi.delete(mindmap.id, nodeId);
        
        // 递归删除子节点
        const deleteRecursively = (id: string) => {
          const node = mindmap.nodes[id];
          if (node) {
            node.child_ids.forEach(deleteRecursively);
            delete mindmap.nodes[id];
          }
        };
        
        deleteRecursively(nodeId);
        
        // 删除相关的边
        Object.keys(mindmap.edges).forEach((edgeId) => {
          const edge = mindmap.edges[edgeId];
          if (edge.source_id === nodeId || edge.target_id === nodeId) {
            delete mindmap.edges[edgeId];
          }
        });
        
        onNodeSelect(null);
        onMindmapUpdate({ ...mindmap });
      } catch (error) {
        console.error('删除节点失败:', error);
      }
    },
    [mindmap, onMindmapUpdate, onNodeSelect]
  );

  // 适应视图
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  // 切换高亮模式
  const handleHighlightModeChange = useCallback((mode: HighlightMode) => {
    setHighlightMode(mode);
    if (mode !== 'custom') {
      setCustomHighlightedNodes(new Set());
    }
  }, []);

  // 切换自定义节点高亮
  const toggleCustomNodeHighlight = useCallback((nodeId: string) => {
    setCustomHighlightedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // 处理节点重命名
  const handleNodeRename = useCallback(async (nodeId: string, newTitle: string) => {
    try {
      const result = await nodeApi.update(mindmap.id, nodeId, { title: newTitle });
      if (result.success) {
        // 更新本地状态
        const updatedMindmap = { ...mindmap };
        if (updatedMindmap.nodes[nodeId]) {
          updatedMindmap.nodes[nodeId].title = newTitle;
          updatedMindmap.nodes[nodeId].updated_at = new Date().toISOString();
          onMindmapUpdate(updatedMindmap);
        }
      } else {
        console.error('重命名节点失败:', result.error);
        alert('重命名失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('重命名节点出错:', error);
      alert('重命名节点失败，请检查网络连接');
    }
  }, [mindmap, onMindmapUpdate]);

  // 获取当前选中节点的继承信息（用于显示）
  const inheritanceInfo = selectedNodeId ? getInheritanceRelatedNodes(mindmap, selectedNodeId) : null;
  const relatedNodeCount = inheritanceInfo ? inheritanceInfo.allRelated.size : 0;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        
        {/* 工具栏 */}
        <Panel position="top-left" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleFitView}
            style={{
              padding: '8px 16px',
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            适应视图
          </button>
          
          {/* 创建根节点按钮 - 始终显示 */}
          <button
            onClick={handleCreateRootNode}
            style={{
              padding: '8px 16px',
              background: '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            创建根节点
          </button>
          
          {selectedNodeId && (
            <>
              <button
                onClick={() => handleAddChildNode(selectedNodeId)}
                style={{
                  padding: '8px 16px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                添加子节点
              </button>
              <button
                onClick={() => handleDeleteNode(selectedNodeId)}
                style={{
                  padding: '8px 16px',
                  background: '#f44336',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                删除节点
              </button>
              
              {/* 高亮控制按钮 */}
              <button
                onClick={() => setShowHighlightPanel(!showHighlightPanel)}
                style={{
                  padding: '8px 16px',
                  background: showHighlightPanel ? '#ff6f00' : '#fff',
                  color: showHighlightPanel ? '#fff' : '#333',
                  border: '1px solid #ff6f00',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>继承高亮</span>
                {relatedNodeCount > 0 && (
                  <span style={{
                    background: showHighlightPanel ? '#fff' : '#ff6f00',
                    color: showHighlightPanel ? '#ff6f00' : '#fff',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}>
                    {relatedNodeCount}
                  </span>
                )}
              </button>
            </>
          )}
        </Panel>

        {/* 高亮控制面板 */}
        {showHighlightPanel && selectedNodeId && (
          <Panel position="top-right" style={{ maxWidth: '280px' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>
                继承关系高亮设置
              </h4>
              
              {/* 高亮模式选择 */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
                  高亮模式：
                </label>
                <select
                  value={highlightMode}
                  onChange={(e) => handleHighlightModeChange(e.target.value as HighlightMode)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <option value="all">全部相关节点 ({relatedNodeCount}个)</option>
                  <option value="ancestors">仅祖先链</option>
                  <option value="direct_parents">仅直接父节点</option>
                  <option value="custom">自定义选择</option>
                </select>
              </div>

              {/* 继承统计信息 */}
              {inheritanceInfo && (
                <div style={{ 
                  fontSize: '11px', 
                  color: '#666', 
                  background: '#f5f5f5',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '10px',
                }}>
                  <div>祖先节点: {inheritanceInfo.ancestors.size}个</div>
                  <div>直接父节点: {inheritanceInfo.directParents.size}个</div>
                  <div>子节点: {inheritanceInfo.children.size}个</div>
                </div>
              )}

              {/* 自定义选择模式下的节点列表 */}
              {highlightMode === 'custom' && inheritanceInfo && (
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
                    点击选择要高亮的节点（已选择 {customHighlightedNodes.size} 个）：
                  </label>
                  {Array.from(inheritanceInfo.allRelated).map(nodeId => {
                    const node = mindmap.nodes[nodeId];
                    if (!node) return null;
                    const isHighlighted = customHighlightedNodes.has(nodeId);
                    return (
                      <div
                        key={nodeId}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCustomNodeHighlight(nodeId);
                        }}
                        style={{
                          padding: '6px 8px',
                          marginBottom: '4px',
                          background: isHighlighted ? '#fff8e1' : '#fff',
                          border: isHighlighted ? '2px solid #ff6f00' : '1px solid #e0e0e0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          userSelect: 'none',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.title}
                        </span>
                        {isHighlighted && <span style={{ color: '#ff6f00', fontWeight: 'bold' }}>✓</span>}
                      </div>
                    );
                  })}
                  {customHighlightedNodes.size > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomHighlightedNodes(new Set());
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        marginTop: '8px',
                        background: '#f5f5f5',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#666',
                      }}
                    >
                      清除选择
                    </button>
                  )}
                </div>
              )}

              {/* 引导说明 */}
              <div style={{ 
                fontSize: '11px', 
                color: '#666', 
                marginTop: '10px',
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: '4px',
                lineHeight: '1.5',
              }}>
                <strong>💡 使用说明：</strong><br/>
                • <strong>全部相关节点</strong>：高亮所有祖先、父节点和子节点<br/>
                • <strong>仅祖先链</strong>：只高亮从根节点到父节点的链条<br/>
                • <strong>仅直接父节点</strong>：只高亮直接继承的父节点<br/>
                • <strong>自定义选择</strong>：手动选择要高亮的节点<br/>
                <br/>
                <span style={{ color: '#ff6f00' }}>橙色高亮</span>表示继承上下文相关的节点和关系线
              </div>
            </div>
          </Panel>
        )}

        {/* 提示信息 */}
        {isConnecting && (
          <Panel position="top-center">
            <div
              style={{
                padding: '8px 16px',
                background: '#fff3e0',
                border: '1px solid #ff9800',
                borderRadius: '4px',
                color: '#e65100',
              }}
            >
              拖拽连接到目标节点以创建关系线
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

export default MindMapCanvas;
