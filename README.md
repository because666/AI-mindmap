# 思流图（ThinkFlowMap）

思流图是一个对话驱动的结构化思维导图系统，以对话为核心载体、思维导图为结构化呈现的交互系统。对话过程与导图结构同步生长，支持多分支并行对话与跨节点逻辑关联。

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

### 6. 节点聚合功能
- 支持将多个节点聚合为一个复合节点
- 展开/折叠切换，保持聚合节点可见
- 扇形布局展示子节点，视觉层级清晰

### 7. AI对话窗口自动打开
- 页面加载后自动显示AI对话界面
- 平滑过渡动画，用户体验流畅
- 支持用户自定义配置

## 技术架构

### 前端
- **框架**: React 19 + TypeScript
- **构建工具**: Vite 8
- **思维导图引擎**: React Flow (@xyflow/react)
- **UI组件**: Lucide React (图标)
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand

### 后端
- **框架**: Express.js (Node.js)
- **数据库**: MongoDB + Neo4j
- **AI服务**: OpenAI API
- **向量存储**: 支持向量检索

## 快速开始

### 环境要求
- Node.js 18+
- MongoDB
- Neo4j (可选)
- OpenAI API密钥

### 1. 克隆仓库
```bash
git clone https://github.com/because666/AI-mindmap.git
cd AI-mindmap
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
在 `server/.env` 文件中配置：
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/mindmap
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
OPENAI_API_KEY=your_api_key
```

### 4. 启动开发服务器
```bash
# 启动后端
npm run dev:server

# 启动前端（新终端）
npm run dev:client
```

### 5. 访问应用
打开浏览器访问 http://localhost:5173

## 项目结构

```
AI-mindmap/
├── client/                    # 前端代码
│   ├── src/
│   │   ├── components/        # React组件
│   │   │   ├── Canvas/        # 画布组件
│   │   │   ├── Chat/          # 对话组件
│   │   │   ├── Layout/        # 布局组件
│   │   │   ├── Node/          # 节点组件
│   │   │   ├── Search/        # 搜索组件
│   │   │   └── Settings/      # 设置组件
│   │   ├── services/          # API服务
│   │   ├── stores/            # 状态管理
│   │   ├── types/             # TypeScript类型
│   │   └── utils/             # 工具函数
│   └── package.json
├── server/                    # 后端代码
│   ├── src/
│   │   ├── config/            # 配置
│   │   ├── data/              # 数据库连接
│   │   ├── middleware/        # 中间件
│   │   ├── routes/            # API路由
│   │   ├── services/          # 业务服务
│   │   └── types/             # TypeScript类型
│   └── package.json
├── zeabur.json               # Zeabur部署配置
└── package.json              # Monorepo配置
```

## API端点

- `GET /health` - 健康检查
- `GET /api/nodes` - 获取节点列表
- `POST /api/nodes` - 创建节点
- `PUT /api/nodes/:id` - 更新节点
- `DELETE /api/nodes/:id` - 删除节点
- `GET /api/conversations/:nodeId` - 获取节点对话
- `POST /api/conversations/:nodeId/messages` - 发送消息
- `POST /api/ai/chat` - AI对话

## 部署

### Zeabur部署
项目已配置 `zeabur.json`，可直接在Zeabur上部署：

1. 连接GitHub仓库
2. 选择AI-mindmap项目
3. 配置环境变量
4. 自动部署

## 许可证

MIT License

## 致谢

- [React Flow](https://reactflow.dev/) - 思维导图可视化
- [Express.js](https://expressjs.com/) - 后端框架
- [OpenAI](https://openai.com/) - AI对话服务
