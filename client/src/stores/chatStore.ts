import { create } from 'zustand';
import type { IMessage, AIProvider } from '../types';

/**
 * 对话状态接口
 */
interface ChatState {
  messages: IMessage[];
  isLoading: boolean;
  error: string | null;
  
  addMessage: (message: Omit<IMessage, '_id' | 'timestamp'>) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * 生成唯一ID
 */
const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * 对话状态管理Store
 */
export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  
  addMessage: (message) => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          _id: generateId(),
          timestamp: new Date()
        }
      ]
    }));
  },
  
  updateLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content
        };
      }
      return { messages };
    });
  },
  
  clearMessages: () => {
    set({ messages: [], error: null });
  },
  
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
  
  setError: (error) => {
    set({ error });
  }
}));

/**
 * 节点状态接口
 */
interface NodeState {
  nodes: Map<string, {
    id: string;
    title: string;
    position: { x: number; y: number };
    parentId: string | null;
    conversationId: string | null;
  }>;
  selectedNodeId: string | null;
  
  addNode: (node: { id: string; title: string; position: { x: number; y: number }; parentId?: string | null }) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  selectNode: (id: string | null) => void;
  deleteNode: (id: string) => void;
}

/**
 * 节点状态管理Store
 */
export const useNodeStore = create<NodeState>((set) => ({
  nodes: new Map(),
  selectedNodeId: null,
  
  addNode: (node) => {
    set((state) => {
      const newNodes = new Map(state.nodes);
      newNodes.set(node.id, {
        ...node,
        parentId: node.parentId ?? null,
        conversationId: null
      });
      return { nodes: newNodes };
    });
  },
  
  updateNodePosition: (id, position) => {
    set((state) => {
      const newNodes = new Map(state.nodes);
      const node = newNodes.get(id);
      if (node) {
        newNodes.set(id, { ...node, position });
      }
      return { nodes: newNodes };
    });
  },
  
  selectNode: (id) => {
    set({ selectedNodeId: id });
  },
  
  deleteNode: (id) => {
    set((state) => {
      const newNodes = new Map(state.nodes);
      newNodes.delete(id);
      if (state.selectedNodeId === id) {
        return { nodes: newNodes, selectedNodeId: null };
      }
      return { nodes: newNodes };
    });
  }
}));
