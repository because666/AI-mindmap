import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface NodeData {
  id: string;
  title: string;
  summary: string;
  isRoot: boolean;
  isComposite: boolean;
  compositeChildren?: string[];
  conversationId?: string;
  position: { x: number; y: number };
  tags: string[];
  parentIds: string[];
  childrenIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RelationData {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  description?: string;
  createdAt: string;
}

export interface ConversationData {
  id: string;
  nodeId: string;
  messages: MessageData[];
  contextConfig: {
    includeParentHistory: boolean;
    includeRelatedNodes: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface MessageData {
  _id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export const nodeApi = {
  getAll: () => api.get<{ success: boolean; data: { nodes: NodeData[]; relations: RelationData[] } }>('/nodes'),
  
  getById: (id: string) => api.get<{ success: boolean; data: NodeData }>(`/nodes/${id}`),
  
  create: (data: Partial<NodeData>) => api.post<{ success: boolean; data: NodeData }>('/nodes', data),
  
  update: (id: string, data: Partial<NodeData>) => 
    api.put<{ success: boolean; data: NodeData }>(`/nodes/${id}`, data),
  
  delete: (id: string) => api.delete<{ success: boolean }>(`/nodes/${id}`),
  
  createChild: (parentId: string, title: string) => 
    api.post<{ success: boolean; data: NodeData }>(`/nodes/${parentId}/child`, { title }),
  
  getRoots: () => api.get<{ success: boolean; data: NodeData[] }>('/nodes/roots'),
};

export const conversationApi = {
  getByNodeId: (nodeId: string) => 
    api.get<{ success: boolean; data: ConversationData }>(`/conversations/${nodeId}`),
  
  sendMessage: (nodeId: string, content: string, model?: string) => 
    api.post<{ success: boolean; data: { userMessage: string; assistantMessage?: string; error?: string } }>(
      `/conversations/${nodeId}/message`,
      { content, role: 'user', model }
    ),
  
  clear: (nodeId: string) => 
    api.delete<{ success: boolean }>(`/conversations/${nodeId}`),
};

export const searchApi = {
  search: (query: string, type: 'text' | 'semantic' | 'hybrid' = 'text') => 
    api.get<{ success: boolean; data: Array<{ nodeId: string; score: number; matches: string[] }> }>(
      '/search',
      { params: { q: query, type } }
    ),
  
  searchByTags: (tags: string[]) => 
    api.get<{ success: boolean; data: Array<{ nodeId: string; score: number; matches: string[] }> }>(
      '/search',
      { params: { tags: tags.join(',') } }
    ),
  
  getRelated: (nodeId: string, depth: number = 2) => 
    api.get<{ success: boolean; data: Array<{ nodeId: string; score: number; matches: string[] }> }>(
      `/search/related/${nodeId}`,
      { params: { depth } }
    ),
};

export const aiApi = {
  chat: (messages: Array<{ role: string; content: string }>, config: { 
    model?: string; 
    temperature?: number;
    apiKey?: string;
  }) => api.post<{ success: boolean; content?: string; error?: string }>('/ai/chat', {
    messages,
    ...config,
  }),
  
  getModels: () => api.get<{ success: boolean; data: string[] }>('/ai/models'),
};

export default api;
