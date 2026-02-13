"""
思流图（ThinkFlowMap）后端服务主入口
FastAPI应用，提供RESTful API和WebSocket支持
"""

import os
import json
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from models import MindMap, Node, Edge, NodeType, RelationType, MessageRole, NodeColor
from ai_service import get_ai_service, AIService


# ============== Pydantic模型定义 ==============

class CreateNodeRequest(BaseModel):
    """创建节点请求模型"""
    title: str = "新节点"
    parent_id: Optional[str] = None
    node_type: str = "branch"
    position_x: float = 0
    position_y: float = 0


class UpdateNodeRequest(BaseModel):
    """更新节点请求模型"""
    title: Optional[str] = None
    color: Optional[str] = None
    is_collapsed: Optional[bool] = None
    inherit_parent_context: Optional[bool] = None


class CreateEdgeRequest(BaseModel):
    """创建关系线请求模型"""
    source_id: str
    target_id: str
    relation_type: str = "reference"
    label: Optional[str] = None
    is_bidirectional: bool = False


class ChatRequest(BaseModel):
    """对话请求模型"""
    node_id: str
    message: str
    enable_thinking: bool = True
    temperature: float = 1.0


class CreateMindMapRequest(BaseModel):
    """创建思维导图请求模型"""
    title: str = "未命名思维导图"
    description: Optional[str] = None


# ============== 全局状态管理 ==============

class AppState:
    """应用状态管理类"""
    
    def __init__(self):
        self.mindmaps: Dict[str, MindMap] = {}
        self.ai_service: Optional[AIService] = None
    
    def initialize_ai(self, api_key: Optional[str] = None):
        """初始化AI服务"""
        try:
            self.ai_service = get_ai_service(api_key)
            return True
        except Exception as e:
            print(f"AI服务初始化失败: {e}")
            return False


# 全局应用状态
app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    
    启动时初始化AI服务
    """
    # 启动时初始化
    api_key = os.getenv("ZHIPUAI_API_KEY")
    if api_key:
        app_state.initialize_ai(api_key)
        print("AI服务初始化成功")
    else:
        print("警告: 未设置ZHIPUAI_API_KEY环境变量，AI功能将不可用")
    
    yield
    
    # 关闭时清理
    print("应用关闭，清理资源...")


# ============== FastAPI应用实例 ==============

app = FastAPI(
    title="思流图（ThinkFlowMap）API",
    description="对话驱动的结构化思维导图系统后端服务",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件目录（Docker容器中路径）
# 在Docker中：工作目录是/app，静态文件在/app/static/
# 本地开发：工作目录是backend/，静态文件在../static/
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
# 检查Docker容器中的路径
if not os.path.exists(static_dir):
    docker_static_dir = "/app/static"
    if os.path.exists(docker_static_dir):
        static_dir = docker_static_dir
        print(f"使用Docker静态文件目录: {static_dir}")

print(f"静态文件目录: {static_dir}, 存在: {os.path.exists(static_dir)}")

# ============== API路由 ==============

@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy"}


# ----- 思维导图管理 -----

@app.post("/api/mindmaps")


# ----- 思维导图管理 -----

@app.post("/api/mindmaps")
async def create_mindmap(request: CreateMindMapRequest):
    """
    创建新的思维导图
    
    Args:
        request: 创建思维导图请求
        
    Returns:
        创建的思维导图信息
    """
    mindmap = MindMap(title=request.title, description=request.description)
    app_state.mindmaps[mindmap.id] = mindmap
    
    return {
        "success": True,
        "data": mindmap.to_dict()
    }


@app.get("/api/mindmaps")
async def list_mindmaps():
    """
    获取所有思维导图列表
    
    Returns:
        思维导图列表
    """
    mindmaps_list = [
        {
            "id": mm.id,
            "title": mm.title,
            "description": mm.description,
            "created_at": mm.created_at.isoformat(),
            "updated_at": mm.updated_at.isoformat(),
            "node_count": len(mm.nodes)
        }
        for mm in app_state.mindmaps.values()
    ]
    
    return {
        "success": True,
        "data": mindmaps_list
    }


@app.get("/api/mindmaps/{mindmap_id}")
async def get_mindmap(mindmap_id: str):
    """
    获取指定思维导图的完整数据
    
    Args:
        mindmap_id: 思维导图ID
        
    Returns:
        思维导图完整数据
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    return {
        "success": True,
        "data": app_state.mindmaps[mindmap_id].to_dict()
    }


@app.delete("/api/mindmaps/{mindmap_id}")
async def delete_mindmap(mindmap_id: str):
    """
    删除思维导图
    
    Args:
        mindmap_id: 思维导图ID
        
    Returns:
        删除结果
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    del app_state.mindmaps[mindmap_id]
    
    return {
        "success": True,
        "message": "思维导图已删除"
    }


# ----- 节点管理 -----

@app.post("/api/mindmaps/{mindmap_id}/nodes")
async def create_node(mindmap_id: str, request: CreateNodeRequest):
    """
    在思维导图中创建新节点
    
    Args:
        mindmap_id: 思维导图ID
        request: 创建节点请求
        
    Returns:
        创建的节点信息
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    # 解析节点类型
    try:
        node_type = NodeType(request.node_type)
    except ValueError:
        node_type = NodeType.BRANCH
    
    # 创建节点
    if request.parent_id:
        node = mindmap.create_node(
            title=request.title,
            parent_id=request.parent_id,
            node_type=node_type,
            position_x=request.position_x,
            position_y=request.position_y
        )
    else:
        node = mindmap.create_root_node(
            title=request.title,
            position_x=request.position_x,
            position_y=request.position_y
        )
    
    return {
        "success": True,
        "data": node.model_dump()
    }


@app.put("/api/mindmaps/{mindmap_id}/nodes/{node_id}")
async def update_node(mindmap_id: str, node_id: str, request: UpdateNodeRequest):
    """
    更新节点信息
    
    Args:
        mindmap_id: 思维导图ID
        node_id: 节点ID
        request: 更新节点请求
        
    Returns:
        更新后的节点信息
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    if node_id not in mindmap.nodes:
        raise HTTPException(status_code=404, detail="节点不存在")
    
    node = mindmap.nodes[node_id]
    
    # 更新字段
    if request.title is not None:
        node.title = request.title
    if request.color is not None:
        try:
            node.color = NodeColor(request.color)
        except ValueError:
            pass
    if request.is_collapsed is not None:
        node.is_collapsed = request.is_collapsed
    if request.inherit_parent_context is not None:
        node.inherit_parent_context = request.inherit_parent_context
    
    node.updated_at = __import__('datetime').datetime.now()
    
    return {
        "success": True,
        "data": node.model_dump()
    }


@app.delete("/api/mindmaps/{mindmap_id}/nodes/{node_id}")
async def delete_node(mindmap_id: str, node_id: str):
    """
    删除节点
    
    Args:
        mindmap_id: 思维导图ID
        node_id: 节点ID
        
    Returns:
        删除结果
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    success = mindmap.delete_node(node_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="节点不存在")
    
    return {
        "success": True,
        "message": "节点已删除"
    }


@app.post("/api/mindmaps/{mindmap_id}/nodes/{node_id}/move")
async def move_node(mindmap_id: str, node_id: str, position_x: float, position_y: float):
    """
    移动节点位置
    
    Args:
        mindmap_id: 思维导图ID
        node_id: 节点ID
        position_x: 新X坐标
        position_y: 新Y坐标
        
    Returns:
        更新后的节点信息
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    if node_id not in mindmap.nodes:
        raise HTTPException(status_code=404, detail="节点不存在")
    
    node = mindmap.nodes[node_id]
    node.position_x = position_x
    node.position_y = position_y
    node.updated_at = __import__('datetime').datetime.now()
    
    return {
        "success": True,
        "data": node.model_dump()
    }


# ----- 关系线管理 -----

@app.post("/api/mindmaps/{mindmap_id}/edges")
async def create_edge(mindmap_id: str, request: CreateEdgeRequest):
    """
    创建关系线
    
    Args:
        mindmap_id: 思维导图ID
        request: 创建关系线请求
        
    Returns:
        创建的关系线信息
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    # 验证节点存在
    if request.source_id not in mindmap.nodes:
        raise HTTPException(status_code=404, detail="源节点不存在")
    if request.target_id not in mindmap.nodes:
        raise HTTPException(status_code=404, detail="目标节点不存在")
    
    # 解析关系类型
    try:
        relation_type = RelationType(request.relation_type)
    except ValueError:
        relation_type = RelationType.REFERENCE
    
    edge = mindmap.create_edge(
        source_id=request.source_id,
        target_id=request.target_id,
        relation_type=relation_type,
        label=request.label,
        is_bidirectional=request.is_bidirectional
    )
    
    return {
        "success": True,
        "data": edge.model_dump()
    }


@app.delete("/api/mindmaps/{mindmap_id}/edges/{edge_id}")
async def delete_edge(mindmap_id: str, edge_id: str):
    """
    删除关系线
    
    Args:
        mindmap_id: 思维导图ID
        edge_id: 关系线ID
        
    Returns:
        删除结果
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    if edge_id not in mindmap.edges:
        raise HTTPException(status_code=404, detail="关系线不存在")
    
    del mindmap.edges[edge_id]
    
    return {
        "success": True,
        "message": "关系线已删除"
    }


# ----- AI对话 -----

@app.post("/api/mindmaps/{mindmap_id}/chat")
async def chat(mindmap_id: str, request: ChatRequest):
    """
    与AI进行非流式对话
    
    Args:
        mindmap_id: 思维导图ID
        request: 对话请求
        
    Returns:
        AI回复内容
    """
    if not app_state.ai_service:
        raise HTTPException(status_code=503, detail="AI服务未初始化，请配置API密钥")
    
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    if request.node_id not in mindmap.nodes:
        raise HTTPException(status_code=404, detail="节点不存在")
    
    node = mindmap.nodes[request.node_id]
    
    # 添加用户消息
    node.add_message(MessageRole.USER, request.message)
    
    # 获取完整上下文
    messages = mindmap.get_node_context(request.node_id)
    
    # 调用AI服务
    try:
        response = await app_state.ai_service.chat(
            messages=messages,
            temperature=request.temperature,
            enable_thinking=request.enable_thinking
        )
        
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
        
        # 添加AI回复到节点
        node.add_message(
            MessageRole.ASSISTANT,
            response["content"],
            response.get("reasoning_content")
        )
        
        return {
            "success": True,
            "data": {
                "content": response["content"],
                "reasoning_content": response.get("reasoning_content"),
                "node_id": request.node_id
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI服务调用失败: {str(e)}")


@app.post("/api/mindmaps/{mindmap_id}/chat/stream")
async def chat_stream(mindmap_id: str, request: ChatRequest):
    """
    与AI进行流式对话
    
    Args:
        mindmap_id: 思维导图ID
        request: 对话请求
        
    Returns:
        流式响应
    """
    if not app_state.ai_service:
        raise HTTPException(status_code=503, detail="AI服务未初始化，请配置API密钥")
    
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    if request.node_id not in mindmap.nodes:
        raise HTTPException(status_code=404, detail="节点不存在")
    
    node = mindmap.nodes[request.node_id]
    
    # 添加用户消息
    node.add_message(MessageRole.USER, request.message)
    
    # 获取完整上下文
    messages = mindmap.get_node_context(request.node_id)
    
    async def generate():
        """生成流式响应"""
        reasoning_parts = []
        content_parts = []
        
        async for msg_type, msg_content in app_state.ai_service.chat_stream(
            messages=messages,
            temperature=request.temperature,
            enable_thinking=request.enable_thinking
        ):
            if msg_type == "reasoning":
                reasoning_parts.append(msg_content)
                yield f"data: {json.dumps({'type': 'reasoning', 'content': msg_content})}\n\n"
            elif msg_type == "content":
                content_parts.append(msg_content)
                yield f"data: {json.dumps({'type': 'content', 'content': msg_content})}\n\n"
            elif msg_type == "error":
                yield f"data: {json.dumps({'type': 'error', 'content': msg_content})}\n\n"
        
        # 保存完整回复到节点
        full_content = "".join(content_parts)
        full_reasoning = "".join(reasoning_parts)
        
        if full_content:
            node.add_message(MessageRole.ASSISTANT, full_content, full_reasoning)
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.get("/api/mindmaps/{mindmap_id}/nodes/{node_id}/context")
async def get_node_context(mindmap_id: str, node_id: str):
    """
    获取节点的完整上下文消息
    
    Args:
        mindmap_id: 思维导图ID
        node_id: 节点ID
        
    Returns:
        上下文消息列表
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    if node_id not in mindmap.nodes:
        raise HTTPException(status_code=404, detail="节点不存在")
    
    context = mindmap.get_node_context(node_id)
    
    return {
        "success": True,
        "data": context
    }


# ----- 导出功能 -----

@app.get("/api/mindmaps/{mindmap_id}/export/json")
async def export_json(mindmap_id: str):
    """
    导出思维导图为JSON格式
    
    Args:
        mindmap_id: 思维导图ID
        
    Returns:
        JSON格式数据
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    return {
        "success": True,
        "data": mindmap.to_dict()
    }


@app.get("/api/mindmaps/{mindmap_id}/export/markdown")
async def export_markdown(mindmap_id: str):
    """
    导出思维导图为Markdown格式
    
    Args:
        mindmap_id: 思维导图ID
        
    Returns:
        Markdown格式文本
    """
    if mindmap_id not in app_state.mindmaps:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    mindmap = app_state.mindmaps[mindmap_id]
    
    def node_to_markdown(node: Node, level: int = 0) -> str:
        """将节点转换为Markdown格式"""
        indent = "  " * level
        md = f"{indent}- **{node.title}**\n"
        
        # 添加对话历史
        for msg in node.messages:
            role_label = "👤" if msg.role == MessageRole.USER else "🤖"
            md += f"{indent}  {role_label} {msg.content[:100]}{'...' if len(msg.content) > 100 else ''}\n"
        
        # 递归添加子节点
        for child_id in node.child_ids:
            if child_id in mindmap.nodes:
                md += node_to_markdown(mindmap.nodes[child_id], level + 1)
        
        return md
    
    # 找到所有根节点
    root_nodes = [n for n in mindmap.nodes.values() if n.type == NodeType.ROOT]
    
    markdown = f"# {mindmap.title}\n\n"
    if mindmap.description:
        markdown += f"{mindmap.description}\n\n"
    
    for root in root_nodes:
        markdown += node_to_markdown(root)
        markdown += "\n"
    
    return {
        "success": True,
        "data": {
            "markdown": markdown
        }
    }


# ----- 配置管理 -----

@app.post("/api/config/ai")
async def configure_ai(api_key: str):
    """
    配置AI服务API密钥
    
    Args:
        api_key: 智谱AI API密钥
        
    Returns:
        配置结果
    """
    success = app_state.initialize_ai(api_key)
    
    if success:
        # 验证API密钥
        if app_state.ai_service.validate_api_key():
            return {
                "success": True,
                "message": "AI服务配置成功"
            }
        else:
            app_state.ai_service = None
            raise HTTPException(status_code=400, detail="API密钥无效")
    else:
        raise HTTPException(status_code=500, detail="AI服务初始化失败")


@app.get("/api/config/ai/status")
async def get_ai_status():
    """
    获取AI服务状态
    
    Returns:
        AI服务状态信息
    """
    return {
        "success": True,
        "data": {
            "initialized": app_state.ai_service is not None,
            "model": app_state.ai_service.model if app_state.ai_service else None
        }
    }


# ============== 静态文件服务 ==============
# 简化的静态文件服务，支持 SPA 路由


def serve_spa(request_path: str) -> str:
    """
    获取SPA请求对应的文件路径
    
    Args:
        request_path: 请求路径
        
    Returns:
        文件路径或None
    """
    # 静态资源文件（有扩展名）
    filename = request_path.lstrip("/")
    if filename and "." in filename.split("/")[-1]:
        file_path = os.path.join(static_dir, filename)
        if os.path.isfile(file_path):
            return file_path
    
    # 其他路径返回 index.html（SPA 路由）
    index_path = os.path.join(static_dir, "index.html")
    if os.path.isfile(index_path):
        return index_path
    
    return None


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """
    处理前端路由请求
    
    Args:
        full_path: 请求路径
        
    Returns:
        静态文件或index.html
    """
    # 如果静态目录不存在，返回API信息
    if not os.path.exists(static_dir):
        return {
            "name": "思流图（ThinkFlowMap）API",
            "version": "1.0.0",
            "status": "running",
            "ai_service_ready": app_state.ai_service is not None,
            "hint": "前端静态文件未部署，请检查构建配置"
        }
    
    # 获取文件路径
    file_path = serve_spa(f"/{full_path}")
    
    if file_path:
        return FileResponse(file_path)
    
    # 文件不存在，返回404
    return {"error": "Not found", "path": full_path}


# ============== 主入口 ==============

if __name__ == "__main__":
    import uvicorn
    # 从环境变量获取端口，默认为8080（Zeabur使用）
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
