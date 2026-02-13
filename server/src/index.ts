import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
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

console.log('='.repeat(50));
console.log('🚀 DeepMindMap Server Starting...');
console.log('='.repeat(50));
console.log(`📅 Time: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`📁 Working Directory: ${process.cwd()}`);
console.log('='.repeat(50));

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: '*',
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

const clientDistPath = process.env.CLIENT_DIST_PATH || path.join(__dirname, '../../client/dist');
console.log('📂 Client dist path:', clientDistPath);
console.log('📂 Client dist exists:', fs.existsSync(clientDistPath));
console.log('📂 Current __dirname:', __dirname);

if (fs.existsSync(clientDistPath)) {
  console.log('✅ Serving static files from:', clientDistPath);
  app.use(express.static(clientDistPath));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found',
      });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });
} else {
  console.warn('⚠️ Client dist not found at:', clientDistPath);
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found',
      });
    }
    res.status(404).json({
      success: false,
      error: 'Client not built',
    });
  });
}

async function startServer() {
  try {
    console.log('');
    console.log('🔄 Connecting to databases...');
    
    const dbConnections = await Promise.allSettled([
      neo4jService.connect(),
      mongoDBService.connect(),
      vectorDBService.initialize(),
    ]);
    
    const failedConnections = dbConnections.filter(r => r.status === 'rejected');
    if (failedConnections.length > 0) {
      console.warn(`⚠️ ${failedConnections.length} database connection(s) failed, continuing with limited functionality`);
      failedConnections.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`   - Connection ${index + 1}: ${result.reason}`);
        }
      });
    }
    
    const connectedCount = dbConnections.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ ${connectedCount}/3 database services connected`);
    
    const port = config.server.port;
    const host = '0.0.0.0';
    
    const server = app.listen(port, host, () => {
      console.log('');
      console.log('='.repeat(50));
      console.log('🚀 DeepMindMap Server v2.0 Started Successfully');
      console.log('='.repeat(50));
      console.log(`📍 Address: http://${host}:${port}`);
      console.log(`⏰ Time: ${new Date().toLocaleString('zh-CN')}`);
      console.log('='.repeat(50));
      console.log('');
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  try {
    await neo4jService.disconnect();
    await mongoDBService.disconnect();
    console.log('✅ Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  try {
    await neo4jService.disconnect();
    await mongoDBService.disconnect();
    console.log('✅ Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;
