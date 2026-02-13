# 思流图（ThinkFlowMap）

思流图是一个**对话驱动的结构化思维导图系统**，以对话为核心载体、思维导图为结构化呈现的交互系统。对话过程与导图结构同步生长，支持多分支并行对话与跨节点逻辑关联。

## 核心特性

### 1. 节点即对话
- 每个节点存储完整的对话历史（用户与AI交互记录）
- 支持编辑、折叠、颜色标记
- 节点内容随对话实时更新

### 2. 多根节点支持
- 允许同一画布创建多个独立根节点
- 表示不同主题或项目起点
- 各根节点及其分支互不干扰

### 3. 分支扩展与多父节点
- 从任意节点创建子节点，支持无限嵌套
- 一个子节点可同时归属于多个父节点
- 子节点可同步继承所有父节点的上下文

### 4. 关系线连接
- 任意两节点间建立单向或双向关系线
- 可标注关联类型（依赖、参考、延伸）
- 关联类型影响AI调取内容的优先级

### 5. 严格上下文隔离
- 每个分支拥有独立AI对话上下文
- 未关联的节点，AI完全无法获取其对话内容
- 关系线建立后，关联节点的对话历史自动双向同步

### 6. 实时导图渲染
- 对话过程中导图实时更新
- 支持拖拽布局、节点折叠/展开
- 颜色标记、图标标注、关键词搜索定位

### 7. 导出与持久化
- 支持导出JSON、Markdown格式
- 数据自动云端同步保存
- 支持版本快照与历史状态恢复

## 技术架构

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **思维导图引擎**: React Flow (@xyflow/react)
- **UI组件**: Lucide React (图标)

### 后端
- **框架**: FastAPI (Python)
- **AI服务**: 智谱AI API (GLM-4)
- **数据模型**: Pydantic
- **CORS**: 支持跨域访问

## 快速开始

### 环境要求
- Python 3.8+
- Node.js 18+
- 智谱AI API密钥

### 1. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置API密钥

**方式一：环境变量**
```bash
# Windows
set ZHIPUAI_API_KEY=your_api_key

# Linux/Mac
export ZHIPUAI_API_KEY=your_api_key
```

**方式二：启动后配置**
启动应用后，在界面中配置API密钥

### 3. 启动后端服务

```bash
# Windows
start_backend.bat

# 或直接使用Python
python start_backend.py
```

后端服务将在 http://localhost:8000 运行

### 4. 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

前端服务将在 http://localhost:5173 运行

### 5. 访问应用

打开浏览器访问 http://localhost:5173

## 使用指南

### 创建思维导图
1. 点击左侧"新建思维导图"按钮
2. 输入标题和描述（可选）
3. 点击"创建"

### 添加节点
1. 选中一个节点
2. 点击"添加子节点"按钮
3. 新节点将自动创建为选中节点的子节点

### 创建关系线
1. 将鼠标悬停在节点上，显示连接点
2. 从一个节点的连接点拖拽到另一个节点
3. 释放鼠标创建关系线

### 与AI对话
1. 选中一个节点
2. 在右侧对话面板输入消息
3. 按 Enter 发送（Shift+Enter 换行）
4. 查看AI回复和思考过程

### 导出思维导图
1. 在左侧列表中找到要导出的思维导图
2. 点击下载图标
3. 选择导出格式（JSON或Markdown）

## API文档

启动后端服务后，访问 http://localhost:8000/docs 查看完整的API文档（Swagger UI）。

### 主要API端点

- `POST /api/mindmaps` - 创建思维导图
- `GET /api/mindmaps` - 获取思维导图列表
- `GET /api/mindmaps/{id}` - 获取思维导图详情
- `POST /api/mindmaps/{id}/nodes` - 创建节点
- `POST /api/mindmaps/{id}/edges` - 创建关系线
- `POST /api/mindmaps/{id}/chat` - 与AI对话
- `POST /api/mindmaps/{id}/chat/stream` - 流式对话

## 项目结构

```
DeepMindMap/
├── backend/                 # 后端代码
│   ├── main.py             # FastAPI主入口
│   ├── models.py           # 数据模型
│   ├── ai_service.py       # AI服务
│   └── requirements.txt    # Python依赖
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   ├── MindMapCanvas.tsx
│   │   │   ├── MindMapNode.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── services/       # API服务
│   │   │   └── api.ts
│   │   ├── types/          # TypeScript类型
│   │   │   └── index.ts
│   │   ├── App.tsx         # 主应用组件
│   │   └── main.tsx        # 应用入口
│   └── package.json
├── start_backend.py        # 后端启动脚本
├── start_backend.bat       # Windows后端启动
├── start_frontend.bat      # Windows前端启动
└── README.md
```

## 使用场景示例

### 场景1：新产品规划
1. 创建根节点"新产品规划"
2. 从主线延伸子节点"功能设计"
3. 从"功能设计"延伸"技术实现"子节点
4. 从"功能设计"分支出"目标用户分析"
5. 连接"目标用户分析"与"开发周期估算"
6. AI在对话时自动调取关联节点内容

### 场景2：多维度知识梳理
1. 创建两个根节点"Python编程"和"机器学习基础"
2. 创建子节点"特征工程"，同时挂载到两个根节点下
3. 在"特征工程"节点对话时，AI自动调取两个根节点的相关对话内容

## 许可证

MIT License

## 致谢

- [React Flow](https://reactflow.dev/) - 思维导图可视化
- [FastAPI](https://fastapi.tiangolo.com/) - 后端框架
- [智谱AI](https://open.bigmodel.cn/) - AI对话服务
