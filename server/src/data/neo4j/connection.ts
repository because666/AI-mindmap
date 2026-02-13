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
    
    const uri = config.neo4j.uri;
    const user = config.neo4j.user;
    const password = config.neo4j.password;
    
    if (!uri || uri === 'bolt://localhost:7687') {
      console.log('⚠️ Neo4j not configured, skipping connection');
      return;
    }
    
    console.log(`🔌 Connecting to Neo4j at ${uri}...`);
    
    try {
      this.driver = neo4j.driver(
        uri,
        neo4j.auth.basic(user, password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 10000,
        }
      );
      
      await this.driver.verifyConnectivity();
      console.log('✅ Neo4j connected successfully');
      await this.initializeConstraints();
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error('❌ Neo4j connection failed:', errorMsg);
      console.warn('⚠️ Continuing without Neo4j');
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
