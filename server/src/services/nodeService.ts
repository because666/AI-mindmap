import { v4 as uuidv4 } from 'uuid';
import { neo4jService } from '../data/neo4j/connection';
import { mongoDBService } from '../data/mongodb/connection';
import { vectorDBService } from '../data/vector/connection';
import { Node, Relation } from '../types';

class NodeService {
  private memoryNodes: Map<string, Node> = new Map();
  private memoryRelations: Relation[] = [];

  async createNode(nodeData: Partial<Node>, userId?: string): Promise<Node> {
    const node: Node = {
      id: nodeData.id || uuidv4(),
      title: nodeData.title || '新节点',
      summary: nodeData.summary || '',
      isRoot: nodeData.isRoot || false,
      isComposite: nodeData.isComposite || false,
      compositeChildren: nodeData.compositeChildren,
      conversationId: nodeData.conversationId,
      position: nodeData.position || { x: 100, y: 100 },
      tags: nodeData.tags || [],
      parentIds: nodeData.parentIds || [],
      childrenIds: nodeData.childrenIds || [],
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (neo4jService.isConnected()) {
      await neo4jService.runQuery(
        `CREATE (n:Node $props)`,
        { props: node }
      );
    }

    this.memoryNodes.set(node.id, node);
    return node;
  }

  async getNode(id: string): Promise<Node | null> {
    if (this.memoryNodes.has(id)) {
      return this.memoryNodes.get(id) || null;
    }

    if (neo4jService.isConnected()) {
      const results = await neo4jService.runQuery<{ n: Node }>(
        `MATCH (n:Node {id: $id}) RETURN n`,
        { id }
      );
      if (results.length > 0) {
        const node = results[0].n;
        this.memoryNodes.set(id, node);
        return node;
      }
    }

    return null;
  }

  async updateNode(id: string, updates: Partial<Node>): Promise<Node | null> {
    const existing = await this.getNode(id);
    if (!existing) return null;

    const updated: Node = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    if (neo4jService.isConnected()) {
      await neo4jService.runQuery(
        `MATCH (n:Node {id: $id}) SET n += $props`,
        { id, props: updated }
      );
    }

    this.memoryNodes.set(id, updated);
    return updated;
  }

  async deleteNode(id: string): Promise<boolean> {
    const node = await this.getNode(id);
    if (!node) return false;

    const allChildren = await this.getAllDescendants(id);
    const allIds = [id, ...allChildren.map(c => c.id)];

    if (neo4jService.isConnected()) {
      for (const nodeId of allIds) {
        await neo4jService.runQuery(
          `MATCH (n:Node {id: $id}) DETACH DELETE n`,
          { id: nodeId }
        );
      }
    }

    for (const nodeId of allIds) {
      this.memoryNodes.delete(nodeId);
      this.memoryRelations = this.memoryRelations.filter(
        r => r.sourceId !== nodeId && r.targetId !== nodeId
      );
    }

    return true;
  }

  async getAllNodes(userId?: string): Promise<Node[]> {
    const nodes = Array.from(this.memoryNodes.values());
    
    if (userId) {
      return nodes.filter(n => n.userId === userId);
    }
    
    return nodes;
  }

  async getAllDescendants(nodeId: string): Promise<Node[]> {
    const descendants: Node[] = [];
    const visited = new Set<string>();
    
    const collect = async (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const node = await this.getNode(id);
      if (node) {
        for (const childId of node.childrenIds) {
          const child = await this.getNode(childId);
          if (child && !visited.has(childId)) {
            descendants.push(child);
            await collect(childId);
          }
        }
      }
    };
    
    await collect(nodeId);
    return descendants;
  }

  async getRootNodes(userId?: string): Promise<Node[]> {
    const nodes = await this.getAllNodes(userId);
    return nodes.filter(n => n.isRoot);
  }

  async createChildNode(parentId: string, title: string, userId?: string): Promise<Node> {
    const parent = await this.getNode(parentId);
    if (!parent) throw new Error('Parent node not found');

    const siblingCount = parent.childrenIds.length;
    const position = {
      x: parent.position.x + 250,
      y: parent.position.y + siblingCount * 120,
    };

    const child = await this.createNode({
      title,
      parentIds: [parentId],
      position,
      isRoot: false,
      userId,
    }, userId);

    await this.updateNode(parentId, {
      childrenIds: [...parent.childrenIds, child.id],
    });

    await this.createRelation({
      sourceId: parentId,
      targetId: child.id,
      type: 'parent-child',
    });

    return child;
  }

  async createRelation(relationData: Omit<Relation, 'id' | 'createdAt'>): Promise<Relation> {
    const relation: Relation = {
      id: uuidv4(),
      ...relationData,
      createdAt: new Date(),
    };

    if (neo4jService.isConnected()) {
      await neo4jService.runQuery(
        `MATCH (s:Node {id: $sourceId}), (t:Node {id: $targetId})
         CREATE (s)-[r:RELATES_TO $props]->(t)`,
        { sourceId: relation.sourceId, targetId: relation.targetId, props: relation }
      );
    }

    this.memoryRelations.push(relation);
    return relation;
  }

  async getRelations(): Promise<Relation[]> {
    return [...this.memoryRelations];
  }

  async getRelationsForNode(nodeId: string): Promise<Relation[]> {
    return this.memoryRelations.filter(
      r => r.sourceId === nodeId || r.targetId === nodeId
    );
  }

  async deleteRelation(id: string): Promise<boolean> {
    const index = this.memoryRelations.findIndex(r => r.id === id);
    if (index === -1) return false;

    if (neo4jService.isConnected()) {
      await neo4jService.runQuery(
        `MATCH ()-[r:RELATES_TO {id: $id}]->() DELETE r`,
        { id }
      );
    }

    this.memoryRelations.splice(index, 1);
    return true;
  }
}

export const nodeService = new NodeService();
