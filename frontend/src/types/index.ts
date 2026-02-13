/**
 * 思流图（ThinkFlowMap）类型定义
 * 定义前端使用的所有数据类型
 */

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息接口
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  reasoning_content?: string;
}

// 节点类型
export type NodeType = 'root' | 'branch' | 'leaf' | 'composite';

// 节点颜色
export type NodeColor = 
  | '#ffffff'  // DEFAULT
  | '#e3f2fd'  // BLUE
  | '#e8f5e9'  // GREEN
  | '#fffde7'  // YELLOW
  | '#ffebee'  // RED
  | '#f3e5f5'  // PURPLE
  | '#fff3e0'; // ORANGE

// 节点接口
export interface Node {
  id: string;
  title: string;
  type: NodeType;
  color: NodeColor;
  messages: Message[];
  parent_ids: string[];
  child_ids: string[];
  position_x: number;
  position_y: number;
  is_collapsed: boolean;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
  inherit_parent_context: boolean;
}

// 关系类型
export type RelationType = 'dependency' | 'reference' | 'extension' | 'parent_child';

// 关系线接口
export interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  label?: string;
  is_bidirectional: boolean;
  created_at: string;
}

// 思维导图接口
export interface MindMap {
  id: string;
  title: string;
  description?: string;
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  created_at: string;
  updated_at: string;
  version: number;
}

// 操作日志类型
export type OperationType = 
  | 'create_node'
  | 'update_node'
  | 'delete_node'
  | 'create_edge'
  | 'delete_edge'
  | 'add_message'
  | 'merge_nodes'
  | 'move_node';

// 操作日志接口
export interface OperationLog {
  id: string;
  operation_type: OperationType;
  node_id?: string;
  edge_id?: string;
  details: Record<string, any>;
  timestamp: string;
  snapshot?: Record<string, any>;
}

// 创建节点请求
export interface CreateNodeRequest {
  title: string;
  parent_id?: string;
  node_type?: NodeType;
  position_x?: number;
  position_y?: number;
}

// 更新节点请求
export interface UpdateNodeRequest {
  title?: string;
  color?: NodeColor;
  is_collapsed?: boolean;
  inherit_parent_context?: boolean;
}

// 创建关系线请求
export interface CreateEdgeRequest {
  source_id: string;
  target_id: string;
  relation_type?: RelationType;
  label?: string;
  is_bidirectional?: boolean;
}

// 对话请求
export interface ChatRequest {
  node_id: string;
  message: string;
  enable_thinking?: boolean;
  temperature?: number;
}

// 对话响应
export interface ChatResponse {
  content: string;
  reasoning_content?: string;
  node_id: string;
}

// 流式消息类型
export type StreamMessageType = 'reasoning' | 'content' | 'error' | 'done';

// 流式消息
export interface StreamMessage {
  type: StreamMessageType;
  content?: string;
}

// AI服务状态
export interface AIStatus {
  initialized: boolean;
  model?: string;
}

// 导出格式
export type ExportFormat = 'json' | 'markdown' | 'png' | 'svg';

// 节点样式配置
export interface NodeStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
  fontSize: number;
  fontWeight: string;
}

// 关系线样式配置
export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}
