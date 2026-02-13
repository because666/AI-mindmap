import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { 
  rateLimiter, 
  errorHandler, 
  requestLogger 
} from './middleware';
import { neo4jService } from './data/neo4j/connection';
import { mongoDBService } from './data/mongodb/connection';
import { vectorDBService } from './data/vector/connection';

import nodesRouter from './routes/nodes';
import conversationsRouter from './routes/conversations';
import searchRouter from './routes/search';
import aiRouter from './routes/ai';

const app = express();

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(requestLogger);
app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      neo4j: neo4jService.isConnected(),
      mongodb: mongoDBService.isConnected(),
      vector: true,
    },
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'DeepMindMap API',
    version: '2.0.0',
    endpoints: {
      nodes: '/api/nodes',
      conversations: '/api/conversations',
      search: '/api/search',
      ai: '/api/ai',
    },
  });
});

app.use('/api/nodes', nodesRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/ai', aiRouter);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

async function startServer() {
  try {
    console.log('🔄 Connecting to databases...');
    
    await Promise.all([
      neo4jService.connect(),
      mongoDBService.connect(),
      vectorDBService.initialize(),
    ]);
    
    console.log('✅ All databases connected');
    
    app.listen(config.server.port, config.server.host, () => {
      console.log('');
      console.log('🚀 DeepMindMap Server v2.0');
      console.log(`📍 Address: http://${config.server.host}:${config.server.port}`);
      console.log(`⏰ Time: ${new Date().toLocaleString('zh-CN')}`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await neo4jService.disconnect();
  await mongoDBService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await neo4jService.disconnect();
  await mongoDBService.disconnect();
  process.exit(0);
});

startServer();

export default app;
