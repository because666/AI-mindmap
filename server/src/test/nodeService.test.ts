import { describe, it, expect, beforeEach } from 'vitest';

/**
 * 模拟节点服务测试
 */
class MockNodeService {
  private memoryNodes: Map<string, any> = new Map();
  private memoryRelations: any[] = [];

  async createNode(nodeData: any): Promise<any> {
    if (nodeData.id && this.memoryNodes.has(nodeData.id)) {
      throw new Error(`Node with id ${nodeData.id} already exists`);
    }

    const node = {
      id: nodeData.id || `node-${Date.now()}`,
      title: nodeData.title?.trim() || '新节点',
      summary: nodeData.summary?.trim() || '',
      isRoot: nodeData.isRoot || false,
      isComposite: nodeData.isComposite || false,
      compositeChildren: nodeData.compositeChildren || [],
      hidden: nodeData.hidden || false,
      expanded: nodeData.expanded || false,
      position: nodeData.position || { x: 100, y: 100 },
      tags: nodeData.tags || [],
      parentIds: nodeData.parentIds || [],
      childrenIds: nodeData.childrenIds || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.memoryNodes.set(node.id, node);
    return node;
  }

  async getNode(id: string): Promise<any | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }
    return this.memoryNodes.get(id) || null;
  }

  async updateNode(id: string, updates: any): Promise<any | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const existing = await this.getNode(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    if (updates.title !== undefined) {
      updated.title = updates.title.trim() || existing.title;
    }
    if (updates.summary !== undefined) {
      updated.summary = updates.summary.trim();
    }

    this.memoryNodes.set(id, updated);
    return updated;
  }

  async deleteNode(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      return false;
    }

    const node = await this.getNode(id);
    if (!node) return false;

    this.memoryNodes.delete(id);
    this.memoryRelations = this.memoryRelations.filter(
      r => r.sourceId !== id && r.targetId !== id
    );

    return true;
  }

  async createRelation(relationData: any): Promise<any> {
    if (!relationData.sourceId || !relationData.targetId) {
      throw new Error('Source and target IDs are required');
    }

    const sourceNode = await this.getNode(relationData.sourceId);
    const targetNode = await this.getNode(relationData.targetId);
    
    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node not found');
    }

    const existingRelation = this.memoryRelations.find(
      r => r.sourceId === relationData.sourceId && 
           r.targetId === relationData.targetId &&
           r.type === relationData.type
    );
    
    if (existingRelation) {
      return existingRelation;
    }

    const relation = {
      id: `relation-${Date.now()}`,
      ...relationData,
      createdAt: new Date(),
    };

    this.memoryRelations.push(relation);
    return relation;
  }

  async getRelations(): Promise<any[]> {
    return [...this.memoryRelations];
  }

  clearMemoryData(): void {
    this.memoryNodes.clear();
    this.memoryRelations = [];
  }
}

describe('NodeService', () => {
  let nodeService: MockNodeService;

  beforeEach(() => {
    nodeService = new MockNodeService();
  });

  describe('createNode', () => {
    it('should create a node with default values', async () => {
      const node = await nodeService.createNode({});
      
      expect(node.id).toBeDefined();
      expect(node.title).toBe('新节点');
      expect(node.summary).toBe('');
      expect(node.isRoot).toBe(false);
      expect(node.hidden).toBe(false);
      expect(node.expanded).toBe(false);
      expect(node.tags).toEqual([]);
      expect(node.parentIds).toEqual([]);
      expect(node.childrenIds).toEqual([]);
    });

    it('should create a node with provided values', async () => {
      const node = await nodeService.createNode({
        title: '  Test Node  ',
        summary: '  Test Summary  ',
        isRoot: true,
        position: { x: 200, y: 300 },
        tags: ['tag1', 'tag2'],
      });
      
      expect(node.title).toBe('Test Node');
      expect(node.summary).toBe('Test Summary');
      expect(node.isRoot).toBe(true);
      expect(node.position).toEqual({ x: 200, y: 300 });
      expect(node.tags).toEqual(['tag1', 'tag2']);
    });

    it('should throw error for duplicate id', async () => {
      await nodeService.createNode({ id: 'duplicate-id' });
      
      await expect(nodeService.createNode({ id: 'duplicate-id' }))
        .rejects.toThrow('Node with id duplicate-id already exists');
    });
  });

  describe('getNode', () => {
    it('should return null for invalid id', async () => {
      expect(await nodeService.getNode('')).toBeNull();
      expect(await nodeService.getNode(null as any)).toBeNull();
      expect(await nodeService.getNode(undefined as any)).toBeNull();
    });

    it('should return null for non-existent node', async () => {
      expect(await nodeService.getNode('non-existent')).toBeNull();
    });

    it('should return node for valid id', async () => {
      await nodeService.createNode({ id: 'test-id', title: 'Test' });
      const node = await nodeService.getNode('test-id');
      
      expect(node).not.toBeNull();
      expect(node?.id).toBe('test-id');
      expect(node?.title).toBe('Test');
    });
  });

  describe('updateNode', () => {
    it('should return null for invalid id', async () => {
      expect(await nodeService.updateNode('', {})).toBeNull();
      expect(await nodeService.updateNode(null as any, {})).toBeNull();
    });

    it('should return null for non-existent node', async () => {
      expect(await nodeService.updateNode('non-existent', {})).toBeNull();
    });

    it('should update node properties', async () => {
      await nodeService.createNode({ id: 'test-id', title: 'Original' });
      const updated = await nodeService.updateNode('test-id', { title: 'Updated' });
      
      expect(updated?.title).toBe('Updated');
    });

    it('should trim title and summary', async () => {
      await nodeService.createNode({ id: 'test-id' });
      const updated = await nodeService.updateNode('test-id', { 
        title: '  Trimmed Title  ',
        summary: '  Trimmed Summary  '
      });
      
      expect(updated?.title).toBe('Trimmed Title');
      expect(updated?.summary).toBe('Trimmed Summary');
    });

    it('should preserve original title when empty string provided', async () => {
      await nodeService.createNode({ id: 'test-id', title: 'Original' });
      const updated = await nodeService.updateNode('test-id', { title: '' });
      
      expect(updated?.title).toBe('Original');
    });

    it('should preserve immutable properties', async () => {
      await nodeService.createNode({ id: 'test-id', title: 'Original' });
      const originalNode = await nodeService.getNode('test-id');
      const updated = await nodeService.updateNode('test-id', { title: 'Updated' });
      
      expect(updated?.id).toBe('test-id');
      expect(updated?.createdAt).toEqual(originalNode?.createdAt);
    });
  });

  describe('deleteNode', () => {
    it('should return false for invalid id', async () => {
      expect(await nodeService.deleteNode('')).toBe(false);
      expect(await nodeService.deleteNode(null as any)).toBe(false);
    });

    it('should return false for non-existent node', async () => {
      expect(await nodeService.deleteNode('non-existent')).toBe(false);
    });

    it('should delete existing node', async () => {
      await nodeService.createNode({ id: 'test-id' });
      const result = await nodeService.deleteNode('test-id');
      
      expect(result).toBe(true);
      expect(await nodeService.getNode('test-id')).toBeNull();
    });

    it('should delete related relations', async () => {
      await nodeService.createNode({ id: 'node1' });
      await nodeService.createNode({ id: 'node2' });
      await nodeService.createRelation({
        sourceId: 'node1',
        targetId: 'node2',
        type: 'parent-child'
      });
      
      await nodeService.deleteNode('node1');
      
      const relations = await nodeService.getRelations();
      expect(relations).toHaveLength(0);
    });
  });

  describe('createRelation', () => {
    it('should throw error for missing source or target', async () => {
      await expect(nodeService.createRelation({ sourceId: '', targetId: 'test' }))
        .rejects.toThrow('Source and target IDs are required');
      await expect(nodeService.createRelation({ sourceId: 'test', targetId: '' }))
        .rejects.toThrow('Source and target IDs are required');
    });

    it('should throw error for non-existent nodes', async () => {
      await expect(nodeService.createRelation({
        sourceId: 'non-existent',
        targetId: 'also-non-existent',
        type: 'parent-child'
      })).rejects.toThrow('Source or target node not found');
    });

    it('should create relation for valid nodes', async () => {
      await nodeService.createNode({ id: 'node1' });
      await nodeService.createNode({ id: 'node2' });
      
      const relation = await nodeService.createRelation({
        sourceId: 'node1',
        targetId: 'node2',
        type: 'parent-child'
      });
      
      expect(relation.id).toBeDefined();
      expect(relation.sourceId).toBe('node1');
      expect(relation.targetId).toBe('node2');
      expect(relation.type).toBe('parent-child');
    });

    it('should return existing relation for duplicate', async () => {
      await nodeService.createNode({ id: 'node1' });
      await nodeService.createNode({ id: 'node2' });
      
      const relation1 = await nodeService.createRelation({
        sourceId: 'node1',
        targetId: 'node2',
        type: 'parent-child'
      });
      
      const relation2 = await nodeService.createRelation({
        sourceId: 'node1',
        targetId: 'node2',
        type: 'parent-child'
      });
      
      expect(relation1.id).toBe(relation2.id);
    });
  });
});

describe('Input Validation', () => {
  it('should validate API key format', () => {
    const validateApiKey = (key: string): boolean => {
      return key && typeof key === 'string' && key.trim().length >= 10;
    };

    expect(validateApiKey('')).toBe(false);
    expect(validateApiKey('short')).toBe(false);
    expect(validateApiKey('valid-api-key-123')).toBe(true);
  });

  it('should validate temperature range', () => {
    const validateTemperature = (temp: number): number => {
      return Math.max(0, Math.min(2, temp));
    };

    expect(validateTemperature(-1)).toBe(0);
    expect(validateTemperature(0.5)).toBe(0.5);
    expect(validateTemperature(1)).toBe(1);
    expect(validateTemperature(3)).toBe(2);
  });

  it('should validate maxTokens range', () => {
    const validateMaxTokens = (tokens: number | undefined): number | undefined => {
      if (!tokens) return undefined;
      return Math.max(1, Math.min(32000, tokens));
    };

    expect(validateMaxTokens(0)).toBe(1);
    expect(validateMaxTokens(1000)).toBe(1000);
    expect(validateMaxTokens(50000)).toBe(32000);
    expect(validateMaxTokens(undefined)).toBeUndefined();
  });
});
