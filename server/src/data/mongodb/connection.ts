import { MongoClient, Db, Collection, Document, Filter, UpdateFilter, FindOptions } from 'mongodb';
import { config } from '../../config';

class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private static instance: MongoDBService;

  private constructor() {}

  static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  async connect(): Promise<void> {
    if (this.client) return;
    
    console.log(`🔌 Connecting to MongoDB at ${config.mongodb.uri}...`);
    
    try {
      this.client = new MongoClient(config.mongodb.uri);
      await this.client.connect();
      this.db = this.client.db(config.mongodb.database);
      console.log('✅ MongoDB connected successfully');
      await this.initializeIndexes();
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error('❌ MongoDB connection failed:');
      console.error(`   URI: ${config.mongodb.uri}`);
      console.error(`   Database: ${config.mongodb.database}`);
      console.error(`   Error: ${errorMsg}`);
      console.error('');
      console.error('   Possible solutions:');
      console.error('   1. Start MongoDB with Docker: docker-compose up -d mongodb');
      console.error('   2. Or install MongoDB Community from: https://www.mongodb.com/try/download/community');
      console.error('   3. Check if MongoDB is running on port 27017');
      console.error('   4. Verify credentials in .env file');
      console.error('');
      console.warn('⚠️ Using in-memory fallback for MongoDB');
      this.client = null;
      this.db = null;
    }
  }

  private async initializeIndexes(): Promise<void> {
    if (!this.db) return;
    
    try {
      await this.db.collection('conversations').createIndex({ nodeId: 1 });
      await this.db.collection('conversations').createIndex({ createdAt: -1 });
      await this.db.collection('messages').createIndex({ conversationId: 1 });
      await this.db.collection('messages').createIndex({ createdAt: -1 });
      await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
      console.log('✅ MongoDB indexes initialized');
    } catch (error) {
      console.warn('Index creation warning:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  getCollection<T extends Document>(name: string): Collection<T> | null {
    return this.db?.collection<T>(name) || null;
  }

  async insertOne<T extends Document>(collection: string, doc: Omit<T, '_id'>): Promise<string | null> {
    const col = this.getCollection<T>(collection);
    if (!col) return null;
    
    const result = await col.insertOne(doc as any);
    return result.insertedId.toString();
  }

  async findOne<T extends Document>(collection: string, filter: Filter<T>): Promise<T | null> {
    const col = this.getCollection<T>(collection);
    if (!col) return null;
    
    return await col.findOne(filter) as T | null;
  }

  async find<T extends Document>(
    collection: string, 
    filter: Filter<T>, 
    options?: FindOptions
  ): Promise<T[]> {
    const col = this.getCollection<T>(collection);
    if (!col) return [];
    
    return await col.find(filter, options).toArray() as T[];
  }

  async updateOne<T extends Document>(
    collection: string, 
    filter: Filter<T>, 
    update: UpdateFilter<T>
  ): Promise<boolean> {
    const col = this.getCollection<T>(collection);
    if (!col) return false;
    
    const result = await col.updateOne(filter, update);
    return result.modifiedCount > 0;
  }

  async deleteOne<T extends Document>(collection: string, filter: Filter<T>): Promise<boolean> {
    const col = this.getCollection<T>(collection);
    if (!col) return false;
    
    const result = await col.deleteOne(filter);
    return result.deletedCount > 0;
  }

  async deleteMany<T extends Document>(collection: string, filter: Filter<T>): Promise<number> {
    const col = this.getCollection<T>(collection);
    if (!col) return 0;
    
    const result = await col.deleteMany(filter);
    return result.deletedCount;
  }

  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }
}

export const mongoDBService = MongoDBService.getInstance();
