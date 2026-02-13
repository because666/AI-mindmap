"""
思流图（ThinkFlowMap）AI服务模块
集成智谱AI API，提供流式对话服务
"""

import os
from typing import AsyncGenerator, List, Dict, Optional
from zhipuai import ZhipuAI


class AIService:
    """
    AI服务类
    
    封装智谱AI API调用，支持流式输出和上下文管理
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        初始化AI服务
        
        Args:
            api_key: 智谱AI API密钥，如果为None则从环境变量获取
        """
        self.api_key = api_key or os.getenv("ZHIPUAI_API_KEY")
        if not self.api_key:
            raise ValueError("API密钥未提供，请设置ZHIPUAI_API_KEY环境变量或直接传入api_key")
        
        self.client = ZhipuAI(api_key=self.api_key)
        self.model = "glm-4-flash"  # 默认模型
    
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 65536,
        temperature: float = 1.0,
        enable_thinking: bool = True
    ) -> AsyncGenerator[tuple[str, str], None]:
        """
        流式对话方法
        
        与AI进行流式对话，实时返回思考内容和回复内容
        
        Args:
            messages: 对话历史消息列表，格式为[{"role": "user", "content": "..."}, ...]
            max_tokens: 最大输出token数
            temperature: 温度参数，控制输出随机性
            enable_thinking: 是否启用深度思考模式
            
        Yields:
            tuple: (内容类型, 内容)
                  内容类型: "reasoning" 表示思考内容, "content" 表示回复内容
        """
        try:
            # 构建请求参数
            params = {
                "model": self.model,
                "messages": messages,
                "stream": True,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            
            # 启用深度思考模式
            if enable_thinking:
                params["extra_body"] = {
                    "thinking": {
                        "type": "enabled"
                    }
                }
            
            # 调用API
            response = self.client.chat.completions.create(**params)
            
            # 流式处理响应
            for chunk in response:
                # 获取思考内容
                if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                    yield ("reasoning", chunk.choices[0].delta.reasoning_content)
                
                # 获取回复内容
                if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                    yield ("content", chunk.choices[0].delta.content)
                    
        except Exception as e:
            yield ("error", f"AI服务调用失败: {str(e)}")
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 65536,
        temperature: float = 1.0,
        enable_thinking: bool = True
    ) -> Dict[str, str]:
        """
        非流式对话方法
        
        与AI进行对话，一次性返回完整回复
        
        Args:
            messages: 对话历史消息列表
            max_tokens: 最大输出token数
            temperature: 温度参数
            enable_thinking: 是否启用深度思考模式
            
        Returns:
            包含完整回复和思考内容的字典
        """
        reasoning_content = []
        content = []
        
        async for msg_type, msg_content in self.chat_stream(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            enable_thinking=enable_thinking
        ):
            if msg_type == "reasoning":
                reasoning_content.append(msg_content)
            elif msg_type == "content":
                content.append(msg_content)
            elif msg_type == "error":
                return {
                    "error": msg_content,
                    "content": "",
                    "reasoning_content": ""
                }
        
        return {
            "content": "".join(content),
            "reasoning_content": "".join(reasoning_content)
        }
    
    def set_model(self, model: str):
        """
        设置使用的AI模型
        
        Args:
            model: 模型名称，如 "glm-4-flash", "glm-4", "glm-4v" 等
        """
        self.model = model
    
    def validate_api_key(self) -> bool:
        """
        验证API密钥是否有效
        
        Returns:
            API密钥是否有效
        """
        try:
            # 发送一个简单的测试请求
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "你好"}],
                max_tokens=10
            )
            return True
        except Exception:
            return False


# 全局AI服务实例
_ai_service: Optional[AIService] = None


def get_ai_service(api_key: Optional[str] = None) -> AIService:
    """
    获取AI服务实例（单例模式）
    
    Args:
        api_key: API密钥（首次调用时需要）
        
    Returns:
        AI服务实例
    """
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService(api_key)
    return _ai_service


def reset_ai_service():
    """
    重置AI服务实例
    
    用于重新初始化或清理资源
    """
    global _ai_service
    _ai_service = None
