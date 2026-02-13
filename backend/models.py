"""
思流图（ThinkFlowMap）数据模型定义
定义节点、关系线、对话历史等核心数据结构
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Set
from datetime import datetime
from enum import Enum
import uuid


class MessageRole(str, Enum):
    """消息角色枚举"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    """
    对话消息模型
    
    存储单条对话消息的内容和元数据
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    reasoning_content: Optional[str] = None  # AI思考过程内容


class NodeType(str, Enum):
    """节点类型枚举"""
    ROOT = "root"           # 根节点
    BRANCH = "branch"       # 分支节点
    LEAF = "leaf"          # 叶子节点
    COMPOSITE = "composite" # 复合节点（合并多个节点）


class NodeColor(str, Enum):
    """节点颜色枚举"""
    DEFAULT = "#ffffff"
    BLUE = "#e3f2fd"
    GREEN = "#e8f5e9"
    YELLOW = "#fffde7"
    RED = "#ffebee"
    PURPLE = "#f3e5f5"
    ORANGE = "#fff3e0"


class Node(BaseModel):
    """
    思维导图节点模型
    
    每个节点存储完整的对话历史，是系统的核心数据单元
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "新节点"
    type: NodeType = NodeType.BRANCH
    color: NodeColor = NodeColor.DEFAULT
    
    # 对话历史
    messages: List[Message] = Field(default_factory=list)
    
    # 节点关系
    parent_ids: List[str] = Field(default_factory=list)  # 支持多父节点
    child_ids: List[str] = Field(default_factory=list)
    
    # 视觉属性
    position_x: float = 0.0
    position_y: float = 0.0
    is_collapsed: bool = False
    is_selected: bool = False
    
    # 元数据
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 上下文继承设置
    inherit_parent_context: bool = True  # 是否继承父节点上下文
    
    def add_message(self, role: MessageRole, content: str, reasoning_content: Optional[str] = None) -> Message:
        """
        添加消息到节点对话历史
        
        Args:
            role: 消息角色
            content: 消息内容
            reasoning_content: AI思考过程内容（可选）
            
        Returns:
            创建的消息对象
        """
        message = Message(role=role, content=content, reasoning_content=reasoning_content)
        self.messages.append(message)
        self.updated_at = datetime.now()
        return message
    
    def get_context_messages(self) -> List[Dict]:
        """
        获取用于AI对话的上下文消息格式
        
        Returns:
            格式化的消息列表，用于API调用
        """
        return [{"role": msg.role.value, "content": msg.content} for msg in self.messages]


class RelationType(str, Enum):
    """关系线类型枚举"""
    DEPENDENCY = "dependency"    # 依赖关系
    REFERENCE = "reference"      # 参考关系
    EXTENSION = "extension"      # 延伸关系
    PARENT_CHILD = "parent_child" # 父子关系


class Edge(BaseModel):
    """
    关系线模型（边）
    
    连接两个节点，表示它们之间的关联关系
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_id: str  # 源节点ID
    target_id: str  # 目标节点ID
    relation_type: RelationType = RelationType.REFERENCE
    label: Optional[str] = None  # 关系标签
    is_bidirectional: bool = False  # 是否双向关系
    
    created_at: datetime = Field(default_factory=datetime.now)


class OperationType(str, Enum):
    """操作类型枚举"""
    CREATE_NODE = "create_node"
    UPDATE_NODE = "update_node"
    DELETE_NODE = "delete_node"
    CREATE_EDGE = "create_edge"
    DELETE_EDGE = "delete_edge"
    ADD_MESSAGE = "add_message"
    MERGE_NODES = "merge_nodes"
    MOVE_NODE = "move_node"


class OperationLog(BaseModel):
    """
    操作日志模型
    
    记录用户操作，支持历史回溯
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    operation_type: OperationType
    node_id: Optional[str] = None
    edge_id: Optional[str] = None
    details: Dict = Field(default_factory=dict)  # 操作详情
    timestamp: datetime = Field(default_factory=datetime.now)
    snapshot: Optional[Dict] = None  # 操作前的状态快照


class MindMap(BaseModel):
    """
    思维导图整体模型
    
    包含所有节点、关系线和元数据
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "未命名思维导图"
    description: Optional[str] = None
    
    nodes: Dict[str, Node] = Field(default_factory=dict)
    edges: Dict[str, Edge] = Field(default_factory=dict)
    operation_logs: List[OperationLog] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    version: int = 1
    
    def create_node(self, title: str, parent_id: Optional[str] = None, 
                    node_type: NodeType = NodeType.BRANCH,
                    position_x: float = 0, position_y: float = 0) -> Node:
        """
        创建新节点
        
        Args:
            title: 节点标题
            parent_id: 父节点ID（可选）
            node_type: 节点类型
            position_x: X坐标位置
            position_y: Y坐标位置
            
        Returns:
            创建的节点对象
        """
        if parent_id:
            node_type = NodeType.BRANCH
            
        node = Node(
            title=title,
            type=node_type,
            position_x=position_x,
            position_y=position_y
        )
        
        if parent_id and parent_id in self.nodes:
            node.parent_ids.append(parent_id)
            self.nodes[parent_id].child_ids.append(node.id)
        
        self.nodes[node.id] = node
        self.updated_at = datetime.now()
        
        # 记录操作日志
        log = OperationLog(
            operation_type=OperationType.CREATE_NODE,
            node_id=node.id,
            details={"title": title, "parent_id": parent_id}
        )
        self.operation_logs.append(log)
        
        return node
    
    def create_root_node(self, title: str, position_x: float = 0, 
                         position_y: float = 0) -> Node:
        """
        创建根节点
        
        Args:
            title: 节点标题
            position_x: X坐标位置
            position_y: Y坐标位置
            
        Returns:
            创建的根节点对象
        """
        return self.create_node(
            title=title,
            node_type=NodeType.ROOT,
            position_x=position_x,
            position_y=position_y
        )
    
    def create_edge(self, source_id: str, target_id: str, 
                    relation_type: RelationType = RelationType.REFERENCE,
                    label: Optional[str] = None,
                    is_bidirectional: bool = False) -> Edge:
        """
        创建关系线
        
        Args:
            source_id: 源节点ID
            target_id: 目标节点ID
            relation_type: 关系类型
            label: 关系标签
            is_bidirectional: 是否双向关系
            
        Returns:
            创建的关系线对象
        """
        edge = Edge(
            source_id=source_id,
            target_id=target_id,
            relation_type=relation_type,
            label=label,
            is_bidirectional=is_bidirectional
        )
        
        self.edges[edge.id] = edge
        self.updated_at = datetime.now()
        
        # 记录操作日志
        log = OperationLog(
            operation_type=OperationType.CREATE_EDGE,
            edge_id=edge.id,
            details={
                "source_id": source_id,
                "target_id": target_id,
                "relation_type": relation_type.value
            }
        )
        self.operation_logs.append(log)
        
        return edge
    
    def _get_all_parent_ids(self, node_id: str, visited: set = None) -> Set[str]:
        """
        递归获取所有父节点ID（包括直接父节点和通过边连接的父节点）
        
        Args:
            node_id: 节点ID
            visited: 已访问节点集合（防止循环）
            
        Returns:
            所有父节点ID集合
        """
        if visited is None:
            visited = set()
        
        if node_id in visited or node_id not in self.nodes:
            return set()
        
        visited.add(node_id)
        node = self.nodes[node_id]
        parent_ids = set()
        
        # 添加显式parent_ids
        parent_ids.update(node.parent_ids)
        
        # 查找通过PARENT_CHILD关系线连接的父节点
        for edge in self.edges.values():
            if edge.relation_type == RelationType.PARENT_CHILD:
                if edge.target_id == node_id:
                    # source -> target 是父节点指向子节点
                    parent_ids.add(edge.source_id)
                elif edge.source_id == node_id and edge.is_bidirectional:
                    # 双向关系时，target也是父节点
                    parent_ids.add(edge.target_id)
        
        return parent_ids
    
    def _get_inheritance_chain_context(
        self, 
        node_id: str, 
        visited: set = None,
        depth: int = 0,
        max_depth: int = 100
    ) -> List[Dict]:
        """
        递归获取继承链的上下文（包括所有祖先节点）
        
        Args:
            node_id: 起始节点ID
            visited: 已访问节点集合
            depth: 当前深度
            max_depth: 最大递归深度
            
        Returns:
            上下文消息列表
        """
        if visited is None:
            visited = set()
        
        if node_id in visited or node_id not in self.nodes or depth > max_depth:
            return []
        
        visited.add(node_id)
        node = self.nodes[node_id]
        messages = []
        
        # 获取直接父节点
        parent_ids = self._get_all_parent_ids(node_id, visited.copy())
        
        if parent_ids and node.inherit_parent_context:
            parent_count = len(parent_ids)
            
            for idx, parent_id in enumerate(sorted(parent_ids), 1):
                if parent_id not in self.nodes:
                    continue
                    
                parent = self.nodes[parent_id]
                
                # 添加上下文标识
                indent = "  " * depth
                prefix = f"{indent}【继承链层级 {depth + 1} - 父节点 {idx}/{parent_count}"
                if parent_count > 1:
                    prefix += "（多分支）"
                prefix += f"：'{parent.title}'"
                
                # 递归获取祖先链
                ancestor_messages = self._get_inheritance_chain_context(
                    parent_id, visited, depth + 1, max_depth
                )
                
                if ancestor_messages:
                    prefix += " 及其祖先链"
                prefix += "】"
                
                messages.append({
                    "role": "system",
                    "content": prefix
                })
                
                # 添加父节点自身的对话
                messages.extend(parent.get_context_messages())
                
                # 添加祖先链的上下文
                if ancestor_messages:
                    messages.extend(ancestor_messages)
        
        return messages
    
    def get_node_context(self, node_id: str) -> List[Dict]:
        """
        获取节点的完整上下文消息
        
        包括节点自身的对话历史和关联节点的对话历史
        支持多父节点继承：递归获取所有祖先链的上下文
        
        Args:
            node_id: 节点ID
            
        Returns:
            格式化的消息列表
        """
        if node_id not in self.nodes:
            return []
        
        node = self.nodes[node_id]
        all_messages = []
        
        # 1. 添加继承链上下文（递归获取所有祖先）
        if node.inherit_parent_context:
            inheritance_messages = self._get_inheritance_chain_context(node_id)
            if inheritance_messages:
                all_messages.append({
                    "role": "system",
                    "content": "【=== 继承上下文开始 ===】"
                })
                all_messages.extend(inheritance_messages)
                all_messages.append({
                    "role": "system",
                    "content": "【=== 继承上下文结束 ===】"
                })
        
        # 2. 添加其他关系线关联节点的上下文（非父子关系）
        all_parent_ids = self._get_all_parent_ids(node_id)
        
        for edge in self.edges.values():
            if edge.relation_type != RelationType.PARENT_CHILD:
                if edge.source_id == node_id or (edge.is_bidirectional and edge.target_id == node_id):
                    related_id = edge.target_id if edge.source_id == node_id else edge.source_id
                    if related_id in self.nodes and related_id not in all_parent_ids:
                        related = self.nodes[related_id]
                        relation_desc = self._get_relation_description(edge)
                        all_messages.append({
                            "role": "system",
                            "content": f"【{relation_desc} '{related.title}' 的上下文】"
                        })
                        all_messages.extend(related.get_context_messages())
        
        # 3. 添加当前节点的对话历史
        all_messages.append({
            "role": "system",
            "content": f"【当前节点 '{node.title}' 的对话】"
        })
        all_messages.extend(node.get_context_messages())
        
        return all_messages
    
    def _get_relation_description(self, edge: Edge) -> str:
        """
        获取关系线描述
        
        Args:
            edge: 关系线对象
            
        Returns:
            关系描述文本
        """
        descriptions = {
            RelationType.DEPENDENCY: "依赖关系节点",
            RelationType.REFERENCE: "参考关系节点",
            RelationType.EXTENSION: "延伸关系节点",
            RelationType.PARENT_CHILD: "父子关系节点"
        }
        return descriptions.get(edge.relation_type, "关联节点")
    
    def delete_node(self, node_id: str) -> bool:
        """
        删除节点
        
        Args:
            node_id: 节点ID
            
        Returns:
            是否删除成功
        """
        if node_id not in self.nodes:
            return False
        
        node = self.nodes[node_id]
        
        # 记录操作日志（保存快照）
        log = OperationLog(
            operation_type=OperationType.DELETE_NODE,
            node_id=node_id,
            details={"node_title": node.title},
            snapshot=node.model_dump()
        )
        self.operation_logs.append(log)
        
        # 从父节点的child_ids中移除
        for parent_id in node.parent_ids:
            if parent_id in self.nodes:
                self.nodes[parent_id].child_ids.remove(node_id)
        
        # 从子节点的parent_ids中移除
        for child_id in node.child_ids:
            if child_id in self.nodes:
                self.nodes[child_id].parent_ids.remove(node_id)
        
        # 删除相关的关系线
        edges_to_delete = [
            edge_id for edge_id, edge in self.edges.items()
            if edge.source_id == node_id or edge.target_id == node_id
        ]
        for edge_id in edges_to_delete:
            del self.edges[edge_id]
        
        # 删除节点
        del self.nodes[node_id]
        self.updated_at = datetime.now()
        
        return True
    
    def to_dict(self) -> Dict:
        """
        将思维导图转换为字典格式
        
        Returns:
            思维导图字典数据
        """
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "nodes": {k: v.model_dump() for k, v in self.nodes.items()},
            "edges": {k: v.model_dump() for k, v in self.edges.items()},
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "version": self.version
        }
