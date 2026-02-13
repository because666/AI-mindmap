import neo4j, { Driver, Session, ManagedTransaction } from 'neo4j-driver';
import { config } from '../../config';

class Neo4jService {
  private driver: Driver | null = null;
  private static instance: Neo4jService;

  private constructor() {}

  static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  async connect(): Promise<void> {
    if (this.driver) return;
    
    console.log(`🔌 Connecting to Neo4j at ${config.neo4j.uri}...`);
    
    this.driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 10000,
      }
    );
    
    try {
      await this.driver.verifyConnectivity();
      console.log('✅ Neo4j connected successfully');
      await this.initializeConstraints();
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error('❌ Neo4j connection failed:');
      console.error(`   URI: ${config.neo4j.uri}`);
      console.error(`   User: ${config.neo4j.user}`);
      console.error(`   Error: ${errorMsg}`);
      console.error('');
      console.error('   Possible solutions:');
      console.error('   1. Start Neo4j with Docker: docker-compose up -d neo4j');
      console.error('   2. Or install Neo4j Desktop from: https://neo4j.com/download/');
      console.error('   3. Check if Neo4j is running on port 7687');
      console.error('');
      console.warn('⚠️ Using in-memory fallback for Neo4j');
      this.driver = null;
    }
  }

  private async initializeConstraints(): Promise<void> {
    if (!this.driver) return;
    
    const session = this.driver.session();
    try {
      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (n:Node) REQUIRE n.id IS UNIQUE
      `);
      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (n:Conversation) REQUIRE n.id IS UNIQUE
      `);
      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (n:User) REQUIRE n.id IS UNIQUE
      `);
      console.log('✅ Neo4j constraints initialized');
    } finally {
      await session.close();
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  getSession(): Session | null {
    return this.driver?.session() || null;
  }

  async runQuery<T = any>(query: string, params: Record<string, any> = {}): Promise<T[]> {
    if (!this.driver) {
      console.warn('Neo4j not connected, skipping query');
      return [];
    }
    
    const session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result.records.map(record => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  async executeInTransaction<T>(
    work: (tx: ManagedTransaction) => Promise<T>
  ): Promise<T | null> {
    if (!this.driver) return null;
    
    const session = this.driver.session();
    try {
      return await session.executeWrite(work);
    } finally {
      await session.close();
    }
  }

  isConnected(): boolean {
    return this.driver !== null;
  }
}

export const neo4jService = Neo4jService.getInstance();
