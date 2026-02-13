import { ObjectId } from 'mongodb';

export interface Node {
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
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  description?: string;
  userId?: string;
  createdAt: Date;
}

export type RelationType = 
  | 'parent-child'
  | 'supports'
  | 'contradicts'
  | 'prerequisite'
  | 'elaborates'
  | 'references'
  | 'conclusion'
  | 'custom';

export interface Conversation {
  _id?: ObjectId;
  id: string;
  nodeId: string;
  messages: Message[];
  contextConfig: {
    includeParentHistory: boolean;
    includeRelatedNodes: string[];
  };
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  _id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    nodeId?: string;
  };
}

export interface User {
  _id?: ObjectId;
  id: string;
  email: string;
  name: string;
  avatar?: string;
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  defaultModel: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    custom?: string;
  };
}

export interface HistoryRecord {
  id: string;
  userId?: string;
  action: string;
  description: string;
  beforeState?: any;
  afterState?: any;
  timestamp: Date;
}

export interface SearchResult {
  nodeId: string;
  score: number;
  matches: string[];
  highlights?: Record<string, string[]>;
}

export interface AIRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  success: boolean;
  embedding?: number[];
  error?: string;
}
