import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IMessage } from '../types';

/**
 * 关系类型定义
 */
export type RelationType = 
  | 'parent-child'
  | 'supports' 
  | 'contradicts' 
  | 'prerequisite' 
  | 'elaborates' 
  | 'references' 
  | 'conclusion' 
  | 'custom';

/**
 * 关系类型标签映射
 */
export const RELATION_TYPE_LABELS: Record<RelationType, { label: string; color: string; description: string }> = {
  'parent-child': { label: '父子', color: '#475569', description: '默认的父子层级关系' },
  supports: { label: '支持', color: '#22c55e', description: '支持或证明某个观点' },
  contradicts: { label: '矛盾', color: '#ef4444', description: '与某个观点相矛盾' },
  prerequisite: { label: '前提', color: '#f59e0b', description: '是另一个节点的前提条件' },
  elaborates: { label: '细化', color: '#3b82f6', description: '对某个观点的详细阐述' },
  references: { label: '参考', color: '#8b5cf6', description: '引用或参考其他内容' },
  conclusion: { label: '结论', color: '#06b6d4', description: '从某个讨论得出的结论' },
  custom: { label: '自定义', color: '#6b7280', description: '用户自定义关系' }
};

/**
 * 节点数据接口
 */
export interface NodeData {
  id: string;
  title: string;
  summary: string;
  parentIds: string[];
  childrenIds: string[];
  isRoot: boolean;
  isComposite: boolean;
  compositeChildren?: string[];
  compositeParent?: string;
  hidden: boolean;
  conversationId: string | null;
  position: { x: number; y: number };
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  expanded: boolean;
}

/**
 * 关系数据接口
 */
export interface RelationData {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  description?: string;
  createdAt: Date;
}

/**
 * 历史操作类型
 */
export type HistoryActionType = 
  | 'create_node' 
  | 'update_node' 
  | 'delete_node' 
  | 'create_relation' 
  | 'delete_relation'
  | 'move_node'
  | 'update_conversation';

/**
 * 历史记录接口
 */
export interface HistoryRecord {
  id: string;
  actionType: HistoryActionType;
  timestamp: Date;
  beforeState?: any;
  afterState?: any;
  description: string;
}

/**
 * 对话数据接口
 */
export interface ConversationData {
  id: string;
  nodeId: string;
  messages: IMessage[];
  contextConfig: {
    includeParentHistory: boolean;
    includeRelatedNodes: string[];
    customContext?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 应用状态接口
 */
interface AppState {
  nodes: Map<string, NodeData>;
  relations: RelationData[];  // 改用数组存储关系
  conversations: Map<string, ConversationData>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  history: HistoryRecord[];
  historyIndex: number;
  searchQuery: string;
  searchResults: { nodeId: string; matches: string[] }[];
  
  // 节点操作
  createRootNode: (title?: string) => string;
  createChildNode: (parentId: string, title?: string) => string;
  addNode: (node: Omit<NodeData, 'createdAt' | 'updatedAt'>) => string;
  updateNode: (id: string, updates: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  
  // 关系操作
  addRelation: (relation: Omit<RelationData, 'id' | 'createdAt'>) => string;
  updateRelation: (id: string, updates: Partial<RelationData>) => void;
  deleteRelation: (id: string) => void;
  getRelationsForNode: (nodeId: string) => RelationData[];
  
  // 对话操作
  addConversation: (nodeId: string) => string;
  addMessage: (conversationId: string, message: Omit<IMessage, '_id' | 'timestamp'>) => void;
  clearConversation: (conversationId: string) => void;
  getConversationContext: (nodeId: string) => { role: 'user' | 'assistant' | 'system'; content: string }[];
  
  // 历史操作
  undo: () => void;
  redo: () => void;
  pushHistory: (action: HistoryActionType, description: string, beforeState?: any, afterState?: any) => void;
  
  // 搜索操作
  setSearchQuery: (query: string) => void;
  searchNodes: () => void;
  
  // 复合节点操作
  createCompositeNode: (nodeIds: string[], title: string) => void;
  expandCompositeNode: (nodeId: string) => void;
  
  // 布局操作
  autoLayout: () => void;
}

/**
 * 生成唯一ID
 */
const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * 计算节点位置
 */
const calculateNodePosition = (
  parentNode: NodeData | null,
  siblingIndex: number,
  siblingCount: number
): { x: number; y: number } => {
  if (!parentNode) {
    return { x: 400, y: 100 };
  }
  
  const offsetX = 280;
  const offsetY = 120;
  const spreadAngle = siblingCount > 1 ? 60 : 0;
  const angleStep = spreadAngle / (siblingCount - 1 || 1);
  const startAngle = -spreadAngle / 2;
  
  const angle = (startAngle + angleStep * siblingIndex) * Math.PI / 180;
  
  return {
    x: parentNode.position.x + offsetX,
    y: parentNode.position.y + Math.sin(angle) * offsetY * (siblingCount > 1 ? 1.5 : 0)
  };
};

/**
 * 应用状态管理Store
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      nodes: new Map(),
      relations: [],  // 改用数组
      conversations: new Map(),
      selectedNodeId: null,
      hoveredNodeId: null,
      history: [],
      historyIndex: -1,
      searchQuery: '',
      searchResults: [],
      
      // 创建根节点
      createRootNode: (title = '新对话') => {
        const id = generateId();
        const existingRoots = Array.from(get().nodes.values()).filter(n => n.isRoot);
        const position = {
          x: 100 + existingRoots.length * 300,
          y: 100
        };
        
        const newNode: NodeData = {
          id,
          title,
          summary: '',
          parentIds: [],
          childrenIds: [],
          isRoot: true,
          isComposite: false,
          compositeChildren: undefined,
          compositeParent: undefined,
          hidden: false,
          conversationId: null,
          position,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          expanded: true
        };
        
        set((state) => {
          const newNodes = new Map(state.nodes);
          newNodes.set(id, newNode);
          return { nodes: newNodes, selectedNodeId: id };
        });
        
        get().pushHistory('create_node', `创建根节点: ${title}`);
        return id;
      },
      
      // 创建子节点
      createChildNode: (parentId, title = '新分支') => {
        const id = generateId();
        const relationId = generateId();
        const parent = get().nodes.get(parentId);
        
        if (!parent) {
          console.error('Parent node not found');
          return '';
        }
        
        const siblingCount = parent.childrenIds.length;
        const position = calculateNodePosition(parent, siblingCount, siblingCount + 1);
        
        const newNode: NodeData = {
          id,
          title,
          summary: '',
          parentIds: [parentId],
          childrenIds: [],
          isRoot: false,
          isComposite: false,
          compositeChildren: undefined,
          compositeParent: undefined,
          hidden: false,
          conversationId: null,
          position,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          expanded: true
        };
        
        const newRelation: RelationData = {
          id: relationId,
          sourceId: parentId,
          targetId: id,
          type: 'parent-child',
          createdAt: new Date()
        };
        
        set((state) => {
          const newNodes = new Map(state.nodes);
          
          newNodes.set(id, newNode);
          
          const updatedParent = newNodes.get(parentId);
          if (updatedParent) {
            newNodes.set(parentId, {
              ...updatedParent,
              childrenIds: [...updatedParent.childrenIds, id]
            });
          }
          
          const allChildren = updatedParent?.childrenIds || [];
          allChildren.forEach((childId, idx) => {
            const child = newNodes.get(childId);
            if (child) {
              newNodes.set(childId, {
                ...child,
                position: calculateNodePosition(updatedParent!, idx, allChildren.length)
              });
            }
          });
          
          const newRelations = [...state.relations, newRelation];
          console.log('Creating child node with relation:', newRelation);
          console.log('Total relations after creation:', newRelations.length);
          
          return { 
            nodes: newNodes, 
            relations: newRelations,
            selectedNodeId: id 
          };
        });
        
        get().pushHistory('create_node', `创建子节点: ${title}`);
        return id;
      },
      
      // 添加节点
      addNode: (node) => {
        const id = node.id;
        const newNode: NodeData = {
          ...node,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        set((state) => {
          const newNodes = new Map(state.nodes);
          newNodes.set(id, newNode);
          
          if (node.parentIds.length > 0) {
            node.parentIds.forEach(parentId => {
              const parent = newNodes.get(parentId);
              if (parent && !parent.childrenIds.includes(id)) {
                newNodes.set(parentId, {
                  ...parent,
                  childrenIds: [...parent.childrenIds, id]
                });
              }
            });
          }
          
          return { nodes: newNodes };
        });
        
        get().pushHistory('create_node', `创建节点: ${node.title}`);
        return id;
      },
      
      updateNode: (id, updates) => {
        set((state) => {
          const newNodes = new Map(state.nodes);
          const node = newNodes.get(id);
          if (node) {
            newNodes.set(id, {
              ...node,
              ...updates,
              updatedAt: new Date()
            });
          }
          return { nodes: newNodes };
        });
        
        get().pushHistory('update_node', `更新节点`);
      },
      
      deleteNode: (id) => {
        set((state) => {
          const newNodes = new Map(state.nodes);
          const newConversations = new Map(state.conversations);
          
          const node = newNodes.get(id);
          if (node) {
            // 递归删除所有子节点
            const deleteRecursive = (nodeId: string) => {
              const n = newNodes.get(nodeId);
              if (n) {
                n.childrenIds.forEach(deleteRecursive);
                
                if (n.conversationId) {
                  newConversations.delete(n.conversationId);
                }
                
                newNodes.delete(nodeId);
              }
            };
            
            deleteRecursive(id);
            
            // 从父节点的childrenIds中移除
            node.parentIds.forEach(parentId => {
              const parent = newNodes.get(parentId);
              if (parent) {
                newNodes.set(parentId, {
                  ...parent,
                  childrenIds: parent.childrenIds.filter(cid => cid !== id)
                });
              }
            });
          }
          
          // 删除相关关系（使用数组过滤）
          const newRelations = state.relations.filter(
            relation => relation.sourceId !== id && relation.targetId !== id
          );
          
          return {
            nodes: newNodes,
            relations: newRelations,
            conversations: newConversations,
            selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
          };
        });
        
        get().pushHistory('delete_node', `删除节点`);
      },
      
      selectNode: (id) => {
        set({ selectedNodeId: id });
      },
      
      hoverNode: (id) => {
        set({ hoveredNodeId: id });
      },
      
      // 关系操作
      addRelation: (relation) => {
        const id = generateId();
        const newRelation: RelationData = {
          ...relation,
          id,
          createdAt: new Date()
        };
        
        console.log('Adding new relation:', newRelation);
        
        set((state) => {
          const newRelations = [...state.relations, newRelation];
          console.log('Total relations after addRelation:', newRelations.length);
          return { relations: newRelations };
        });
        
        get().pushHistory('create_relation', `创建关系: ${RELATION_TYPE_LABELS[relation.type].label}`);
        return id;
      },
      
      updateRelation: (id, updates) => {
        set((state) => ({
          relations: state.relations.map(relation =>
            relation.id === id ? { ...relation, ...updates } : relation
          )
        }));
      },
      
      deleteRelation: (id) => {
        set((state) => ({
          relations: state.relations.filter(relation => relation.id !== id)
        }));
        
        get().pushHistory('delete_relation', `删除关系`);
      },
      
      getRelationsForNode: (nodeId) => {
        return get().relations.filter(
          relation => relation.sourceId === nodeId || relation.targetId === nodeId
        );
      },
      
      // 对话操作
      addConversation: (nodeId) => {
        const id = generateId();
        const newConversation: ConversationData = {
          id,
          nodeId,
          messages: [],
          contextConfig: {
            includeParentHistory: true,
            includeRelatedNodes: []
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        set((state) => {
          const newConversations = new Map(state.conversations);
          newConversations.set(id, newConversation);
          
          const newNodes = new Map(state.nodes);
          const node = newNodes.get(nodeId);
          if (node) {
            newNodes.set(nodeId, { ...node, conversationId: id });
          }
          
          return { conversations: newConversations, nodes: newNodes };
        });
        
        return id;
      },
      
      addMessage: (conversationId, message) => {
        set((state) => {
          const newConversations = new Map(state.conversations);
          const conversation = newConversations.get(conversationId);
          if (conversation) {
            newConversations.set(conversationId, {
              ...conversation,
              messages: [
                ...conversation.messages,
                {
                  ...message,
                  _id: generateId(),
                  timestamp: new Date()
                }
              ],
              updatedAt: new Date()
            });
          }
          return { conversations: newConversations };
        });
      },
      
      clearConversation: (conversationId) => {
        set((state) => {
          const newConversations = new Map(state.conversations);
          const conversation = newConversations.get(conversationId);
          if (conversation) {
            newConversations.set(conversationId, {
              ...conversation,
              messages: [],
              updatedAt: new Date()
            });
          }
          return { conversations: newConversations };
        });
      },
      
      // 获取节点的对话上下文（包含祖先节点历史）
      getConversationContext: (nodeId) => {
        const { nodes, conversations, relations } = get();
        const contextMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
        const visitedNodes = new Set<string>();
        
        const collectContext = (currentNodeId: string, depth: number = 0) => {
          if (visitedNodes.has(currentNodeId) || depth > 20) return;
          visitedNodes.add(currentNodeId);
          
          const currentNode = nodes.get(currentNodeId);
          if (!currentNode) return;
          
          // 先收集祖先节点的上下文
          currentNode.parentIds.forEach(parentId => {
            collectContext(parentId, depth + 1);
          });
          
          // 收集通过关系连接的节点上下文（使用数组方法）
          relations.forEach((relation) => {
            if (relation.targetId === currentNodeId && relation.type !== 'parent-child') {
              collectContext(relation.sourceId, depth + 1);
            }
          });
          
          // 收集当前节点的对话
          if (currentNode.conversationId) {
            const conv = conversations.get(currentNode.conversationId);
            if (conv && conv.messages.length > 0) {
              contextMessages.push({
                role: 'system',
                content: `[节点: ${currentNode.title}]`
              });
              conv.messages.forEach(msg => {
                contextMessages.push({
                  role: msg.role,
                  content: msg.content
                });
              });
            }
          }
        };
        
        collectContext(nodeId);
        return contextMessages;
      },
      
      // 历史操作
      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= 0) {
          const record = history[historyIndex];
          if (record.beforeState) {
            set(record.beforeState);
          }
          set({ historyIndex: historyIndex - 1 });
        }
      },
      
      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const record = history[historyIndex + 1];
          if (record.afterState) {
            set(record.afterState);
          }
          set({ historyIndex: historyIndex + 1 });
        }
      },
      
      pushHistory: (actionType, description, beforeState?, afterState?) => {
        const record: HistoryRecord = {
          id: generateId(),
          actionType,
          timestamp: new Date(),
          beforeState,
          afterState,
          description
        };
        
        set((state) => {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(record);
          return {
            history: newHistory,
            historyIndex: newHistory.length - 1
          };
        });
      },
      
      // 搜索操作
      setSearchQuery: (query) => {
        set({ searchQuery: query });
        if (query.trim()) {
          get().searchNodes();
        } else {
          set({ searchResults: [] });
        }
      },
      
      searchNodes: () => {
        const { nodes, conversations, searchQuery } = get();
        if (!searchQuery.trim()) {
          set({ searchResults: [] });
          return;
        }
        
        const query = searchQuery.toLowerCase();
        const results: { nodeId: string; matches: string[] }[] = [];
        
        nodes.forEach((node, nodeId) => {
          const matches: string[] = [];
          
          if (node.title.toLowerCase().includes(query)) {
            matches.push(`标题: ${node.title}`);
          }
          
          if (node.summary.toLowerCase().includes(query)) {
            matches.push(`摘要: ${node.summary}`);
          }
          
          if (node.conversationId) {
            const conversation = conversations.get(node.conversationId);
            if (conversation) {
              conversation.messages.forEach(msg => {
                if (msg.content.toLowerCase().includes(query)) {
                  matches.push(`对话: ${msg.content.substring(0, 50)}...`);
                }
              });
            }
          }
          
          if (matches.length > 0) {
            results.push({ nodeId, matches });
          }
        });
        
        set({ searchResults: results });
      },
      
      // 复合节点操作
      createCompositeNode: (nodeIds, title) => {
        const compositeId = generateId();
        
        set((state) => {
          const newNodes = new Map(state.nodes);
          const nodesToAggregate: NodeData[] = [];
          
          nodeIds.forEach(id => {
            const node = newNodes.get(id);
            if (node) {
              nodesToAggregate.push(node);
            }
          });
          
          if (nodesToAggregate.length === 0) return state;
          
          const centerX = nodesToAggregate.reduce((sum, n) => sum + n.position.x, 0) / nodesToAggregate.length;
          const centerY = nodesToAggregate.reduce((sum, n) => sum + n.position.y, 0) / nodesToAggregate.length;
          
          const compositeNode: NodeData = {
            id: compositeId,
            title,
            summary: `包含 ${nodeIds.length} 个节点`,
            parentIds: [],
            childrenIds: [],
            isRoot: false,
            isComposite: true,
            compositeChildren: nodeIds,
            compositeParent: undefined,
            hidden: false,
            conversationId: null,
            position: { x: centerX, y: centerY },
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [],
            expanded: false
          };
          
          newNodes.set(compositeId, compositeNode);
          
          nodeIds.forEach(id => {
            const node = newNodes.get(id);
            if (node) {
              newNodes.set(id, {
                ...node,
                hidden: true,
                compositeParent: compositeId
              });
            }
          });
          
          return { nodes: newNodes };
        });
        
        get().pushHistory('create_node', `创建复合节点: ${title}`);
      },
      
      /**
       * 切换聚合节点的展开/折叠状态
       * 展开时：子节点以扇形分布在聚合节点周围，聚合节点保持可见
       * 折叠时：子节点隐藏，恢复聚合节点状态
       */
      expandCompositeNode: (nodeId) => {
        set((state) => {
          const newNodes = new Map(state.nodes);
          const node = newNodes.get(nodeId);
          
          if (node && node.isComposite && node.compositeChildren) {
            const isCurrentlyExpanded = node.expanded;
            
            if (isCurrentlyExpanded) {
              // 折叠操作：隐藏子节点
              node.compositeChildren.forEach(childId => {
                const child = newNodes.get(childId);
                if (child) {
                  newNodes.set(childId, { 
                    ...child, 
                    hidden: true,
                    compositeParent: nodeId
                  });
                }
              });
              
              // 更新聚合节点状态为折叠
              newNodes.set(nodeId, {
                ...node,
                expanded: false
              });
            } else {
              // 展开操作：计算子节点的扇形位置并显示
              const childCount = node.compositeChildren.length;
              const centerX = node.position.x;
              const centerY = node.position.y;
              
              // 扇形布局参数
              const baseRadius = 200; // 基础半径
              const radius = Math.max(baseRadius, baseRadius + (childCount - 3) * 30); // 根据子节点数量调整半径
              const spreadAngle = Math.min(180, 60 + childCount * 15); // 扇形角度，最大180度
              const startAngle = -spreadAngle / 2;
              const angleStep = childCount > 1 ? spreadAngle / (childCount - 1) : 0;
              
              node.compositeChildren.forEach((childId, index) => {
                const child = newNodes.get(childId);
                if (child) {
                  // 计算扇形位置
                  const angle = (startAngle + angleStep * index) * Math.PI / 180;
                  const newX = centerX + Math.cos(angle) * radius;
                  const newY = centerY + Math.sin(angle) * radius;
                  
                  newNodes.set(childId, { 
                    ...child, 
                    hidden: false,
                    compositeParent: nodeId,
                    position: { x: newX, y: newY }
                  });
                }
              });
              
              // 更新聚合节点状态为展开（不删除）
              newNodes.set(nodeId, {
                ...node,
                expanded: true
              });
            }
          }
          
          return { nodes: newNodes };
        });
        
        get().pushHistory('update_node', `切换复合节点展开状态`);
      },
      
      // 自动布局
      autoLayout: () => {
        set((state) => {
          const newNodes = new Map(state.nodes);
          const roots = Array.from(newNodes.values()).filter(n => n.isRoot);
          
          const layoutNode = (node: NodeData, x: number, y: number, level: number) => {
            newNodes.set(node.id, { ...node, position: { x, y } });
            
            const children = node.childrenIds.map(id => newNodes.get(id)!).filter(Boolean);
            const childSpacing = 150;
            const startY = y - (children.length - 1) * childSpacing / 2;
            
            children.forEach((child, index) => {
              layoutNode(child, x + 300, startY + index * childSpacing, level + 1);
            });
          };
          
          roots.forEach((root, index) => {
            layoutNode(root, 100, 100 + index * 300, 0);
          });
          
          return { nodes: newNodes };
        });
      }
    }),
    {
      name: 'deep-mind-map-storage',
      partialize: (state) => ({
        nodes: Array.from(state.nodes.entries()),
        relations: state.relations,
        conversations: Array.from(state.conversations.entries())
      }),
      onRehydrateStorage: () => (state) => {
        console.log('=== onRehydrateStorage called ===');
        console.log('Raw state:', state);
        
        if (state) {
          console.log('Raw nodes:', state.nodes);
          console.log('Raw relations:', state.relations);
          
          state.nodes = new Map(state.nodes as any);
          console.log('Converted nodes count:', state.nodes.size);
          
          // 为旧节点添加 hidden 属性
          state.nodes.forEach((node: any) => {
            if (node.hidden === undefined) {
              node.hidden = false;
            }
            if (node.compositeParent === undefined) {
              node.compositeParent = undefined;
            }
          });
          
          // 处理旧数据格式：如果 relations 是 Map entries 格式，转换为数组
          if (state.relations && !Array.isArray(state.relations)) {
            console.log('Relations not array, converting to empty array');
            state.relations = [];
          }
          // 如果 relations 数组中的元素是 [id, relation] 格式（Map entries），转换为纯数组
          if (Array.isArray(state.relations) && state.relations.length > 0) {
            console.log('First relation item:', state.relations[0]);
            const firstItem = state.relations[0];
            if (Array.isArray(firstItem) && firstItem.length === 2) {
              console.log('Converting from Map entries format');
              // 这是旧的 Map entries 格式，需要转换
              state.relations = state.relations.map((entry: any) => entry[1]).filter(Boolean);
            }
          }
          // 确保每个 relation 都有有效的 type 属性
          if (Array.isArray(state.relations)) {
            const beforeFilter = state.relations.length;
            state.relations = state.relations.filter((r: any) => r && r.type);
            console.log(`Filtered relations: ${beforeFilter} -> ${state.relations.length}`);
          }
          
          console.log('Final relations count:', state.relations?.length || 0);
          console.log('Final relations:', state.relations);
          
          state.conversations = new Map(state.conversations as any);
        }
        console.log('=== End onRehydrateStorage ===');
      }
    }
  )
);
