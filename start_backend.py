"""
思流图（ThinkFlowMap）后端启动脚本
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """检查依赖是否已安装"""
    try:
        import fastapi
        import zhipuai
        return True
    except ImportError:
        return False

def install_dependencies():
    """安装依赖"""
    print("正在安装依赖...")
    backend_dir = Path(__file__).parent / "backend"
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(backend_dir / "requirements.txt")])
    print("依赖安装完成！")

def main():
    """主函数"""
    # 检查依赖
    if not check_dependencies():
        print("检测到依赖未安装，正在安装...")
        install_dependencies()
    
    # 设置环境变量（如果提供了API密钥）
    api_key = os.getenv("ZHIPUAI_API_KEY")
    if not api_key:
        print("\n警告: 未设置 ZHIPUAI_API_KEY 环境变量")
        print("AI功能将不可用，请在启动后通过界面配置API密钥")
        print("或者设置环境变量: set ZHIPUAI_API_KEY=your_api_key\n")
    
    # 启动后端服务
    print("启动思流图后端服务...")
    print("服务将在 http://localhost:8000 运行")
    print("按 Ctrl+C 停止服务\n")
    
    backend_dir = Path(__file__).parent / "backend"
    os.chdir(backend_dir)
    
    try:
        subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"])
    except KeyboardInterrupt:
        print("\n服务已停止")

if __name__ == "__main__":
    main()
