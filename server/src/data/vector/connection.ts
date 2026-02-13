import { config } from '../../config';

interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  createdAt: Date;
}

class VectorDBService {
  private vectors: Map<string, VectorRecord> = new Map();
  private static instance: VectorDBService;
  private dimension: number;

  private constructor() {
    this.dimension = config.vector.dimension;
  }

  static getInstance(): VectorDBService {
    if (!VectorDBService.instance) {
      VectorDBService.instance = new VectorDBService();
    }
    return VectorDBService.instance;
  }

  async initialize(): Promise<void> {
    console.log('✅ VectorDB (in-memory) initialized');
  }

  async insertVector(id: string, vector: number[], metadata: Record<string, any> = {}): Promise<void> {
    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimension}, got ${vector.length}`);
    }
    
    this.vectors.set(id, {
      id,
      vector,
      metadata,
      createdAt: new Date(),
    });
  }

  async getVector(id: string): Promise<VectorRecord | null> {
    return this.vectors.get(id) || null;
  }

  async deleteVector(id: string): Promise<boolean> {
    return this.vectors.delete(id);
  }

  async searchSimilar(queryVector: number[], topK: number = 10, filter?: Record<string, any>): Promise<Array<{ id: string; score: number; metadata: Record<string, any> }>> {
    if (queryVector.length !== this.dimension) {
      throw new Error(`Query vector dimension mismatch: expected ${this.dimension}, got ${queryVector.length}`);
    }

    const results: Array<{ id: string; score: number; metadata: Record<string, any> }> = [];

    for (const [id, record] of this.vectors) {
      if (filter) {
        const matchesFilter = Object.entries(filter).every(([key, value]) => record.metadata[key] === value);
        if (!matchesFilter) continue;
      }

      const score = this.cosineSimilarity(queryVector, record.vector);
      results.push({ id, score, metadata: record.metadata });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  async getStats(): Promise<{ totalVectors: number; dimension: number }> {
    return {
      totalVectors: this.vectors.size,
      dimension: this.dimension,
    };
  }

  async clear(): Promise<void> {
    this.vectors.clear();
  }
}

export const vectorDBService = VectorDBService.getInstance();
