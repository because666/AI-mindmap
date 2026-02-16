import { v4 as uuidv4 } from 'uuid';
import { neo4jService } from '../data/neo4j/connection';
import { mongoDBService } from '../data/mongodb/connection';
import { vectorDBService } from '../data/vector/connection';
import { Node, Relation } from '../types';

/**
 * 默认节点位置
 */
const DEFAULT_POSITION = { x: 100, y: 100 };

/**
 * 节点服务类
 * 提供节点的CRUD操作和关系管理
 */
class NodeService {
  private memoryNodes: Map<string, Node> = new Map();
  private memoryRelations: Relation[] = [];

  /**
   * 创建节点
   * @param nodeData - 节点数据
   * @param userId - 用户ID
   * @returns 创建的节点
   */
  async createNode(nodeData: Partial<Node>, userId?: string): Promise<Node> {
    if (nodeData.id && this.memoryNodes.has(nodeData.id)) {
      throw new Error(`Node with id ${nodeData.id} already exists`);
    }

    const node: Node = {
      id: nodeData.id || uuidv4(),
      title: nodeData.title?.trim() || '新节点',
      summary: nodeData.summary?.trim() || '',
      isRoot: nodeData.isRoot || false,
      isComposite: nodeData.isComposite || false,
      compositeChildren: nodeData.compositeChildren || [],
      compositeParent: nodeData.compositeParent,
      hidden: nodeData.hidden || false,
      expanded: nodeData.expanded || false,
      conversationId: nodeData.conversationId,
      position: nodeData.position || DEFAULT_POSITION,
      tags: nodeData.tags || [],
      parentIds: nodeData.parentIds || [],
      childrenIds: nodeData.childrenIds || [],
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (neo4jService.isConnected()) {
      try {
        await neo4jService.runQuery(
          `CREATE (n:Node $props)`,
          { props: node }
        );
      } catch (error) {
        console.error('Failed to create node in Neo4j:', error);
      }
    }

    this.memoryNodes.set(node.id, node);
    return node;
  }

  /**
   * 获取节点
   * @param id - 节点ID
   * @returns 节点数据或null
   */
  async getNode(id: string): Promise<Node | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    if (this.memoryNodes.has(id)) {
      return this.memoryNodes.get(id) || null;
    }

    if (neo4jService.isConnected()) {
      try {
        const results = await neo4jService.runQuery<{ n: Node }>(
          `MATCH (n:Node {id: $id}) RETURN n`,
          { id }
        );
        if (results.length > 0) {
          const node = results[0].n;
          this.memoryNodes.set(id, node);
          return node;
        }
      } catch (error) {
        console.error('Failed to get node from Neo4j:', error);
      }
    }

    return null;
  }

  /**
   * 更新节点
   * @param id - 节点ID
   * @param updates - 更新内容
   * @returns 更新后的节点或null
   */
  async updateNode(id: string, updates: Partial<Node>): Promise<Node | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const existing = await this.getNode(id);
    if (!existing) return null;

    const updated: Node = {
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

    if (neo4jService.isConnected()) {
      try {
        await neo4jService.runQuery(
          `MATCH (n:Node {id: $id}) SET n += $props`,
          { id, props: updated }
        );
      } catch (error) {
        console.error('Failed to update node in Neo4j:', error);
      }
    }

    this.memoryNodes.set(id, updated);
    return updated;
  }

  /**
   * 删除节点
   * @param id - 节点ID
   * @returns 是否删除成功
   */
  async deleteNode(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      return false;
    }

    const node = await this.getNode(id);
    if (!node) return false;

    const allChildren = await this.getAllDescendants(id);
    const allIds = [id, ...allChildren.map(c => c.id)];

    if (neo4jService.isConnected()) {
      try {
        for (const nodeId of allIds) {
          await neo4jService.runQuery(
            `MATCH (n:Node {id: $id}) DETACH DELETE n`,
            { id: nodeId }
          );
        }
      } catch (error) {
        console.error('Failed to delete nodes from Neo4j:', error);
      }
    }

    for (const nodeId of allIds) {
      this.memoryNodes.delete(nodeId);
      this.memoryRelations = this.memoryRelations.filter(
        r => r.sourceId !== nodeId && r.targetId !== nodeId
      );
    }

    for (const parentId of node.parentIds) {
      const parent = await this.getNode(parentId);
      if (parent) {
        await this.updateNode(parentId, {
          childrenIds: parent.childrenIds.filter(cid => cid !== id),
        });
      }
    }

    return true;
  }

  /**
   * 获取所有节点
   * @param userId - 用户ID（可选）
   * @returns 节点列表
   */
  async getAllNodes(userId?: string): Promise<Node[]> {
    const nodes = Array.from(this.memoryNodes.values());
    
    if (userId) {
      return nodes.filter(n => n.userId === userId);
    }
    
    return nodes;
  }

  /**
   * 获取节点的所有后代节点
   * @param nodeId - 节点ID
   * @returns 后代节点列表
   */
  async getAllDescendants(nodeId: string): Promise<Node[]> {
    const descendants: Node[] = [];
    const visited = new Set<string>();
    
    /**
     * 递归收集后代节点
     * @param id - 当前节点ID
     */
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

  /**
   * 获取根节点
   * @param userId - 用户ID（可选）
   * @returns 根节点列表
   */
  async getRootNodes(userId?: string): Promise<Node[]> {
    const nodes = await this.getAllNodes(userId);
    return nodes.filter(n => n.isRoot && !n.hidden);
  }

  /**
   * 创建子节点
   * @param parentId - 父节点ID
   * @param title - 节点标题
   * @param userId - 用户ID
   * @returns 创建的子节点
   */
  async createChildNode(parentId: string, title: string, userId?: string): Promise<Node> {
    const parent = await this.getNode(parentId);
    if (!parent) {
      throw new Error('Parent node not found');
    }

    const siblingCount = parent.childrenIds.length;
    const position = {
      x: parent.position.x + 250,
      y: parent.position.y + siblingCount * 120,
    };

    const child = await this.createNode({
      title: title.trim() || '新分支',
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

  /**
   * 创建关系
   * @param relationData - 关系数据
   * @returns 创建的关系
   */
  async createRelation(relationData: Omit<Relation, 'id' | 'createdAt'>): Promise<Relation> {
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

    const relation: Relation = {
      id: uuidv4(),
      ...relationData,
      createdAt: new Date(),
    };

    if (neo4jService.isConnected()) {
      try {
        await neo4jService.runQuery(
          `MATCH (s:Node {id: $sourceId}), (t:Node {id: $targetId})
           CREATE (s)-[r:RELATES_TO $props]->(t)`,
          { sourceId: relation.sourceId, targetId: relation.targetId, props: relation }
        );
      } catch (error) {
        console.error('Failed to create relation in Neo4j:', error);
      }
    }

    this.memoryRelations.push(relation);
    return relation;
  }

  /**
   * 获取所有关系
   * @returns 关系列表
   */
  async getRelations(): Promise<Relation[]> {
    return [...this.memoryRelations];
  }

  /**
   * 获取节点相关的所有关系
   * @param nodeId - 节点ID
   * @returns 关系列表
   */
  async getRelationsForNode(nodeId: string): Promise<Relation[]> {
    if (!nodeId || typeof nodeId !== 'string') {
      return [];
    }
    return this.memoryRelations.filter(
      r => r.sourceId === nodeId || r.targetId === nodeId
    );
  }

  /**
   * 删除关系
   * @param id - 关系ID
   * @returns 是否删除成功
   */
  async deleteRelation(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      return false;
    }

    const index = this.memoryRelations.findIndex(r => r.id === id);
    if (index === -1) return false;

    if (neo4jService.isConnected()) {
      try {
        await neo4jService.runQuery(
          `MATCH ()-[r:RELATES_TO {id: $id}]->() DELETE r`,
          { id }
        );
      } catch (error) {
        console.error('Failed to delete relation from Neo4j:', error);
      }
    }

    this.memoryRelations.splice(index, 1);
    return true;
  }

  /**
   * 展开复合节点
   * @param nodeId - 复合节点ID
   * @returns 更新后的节点
   */
  async expandCompositeNode(nodeId: string): Promise<Node | null> {
    const node = await this.getNode(nodeId);
    if (!node || !node.isComposite) {
      return null;
    }

    const isCurrentlyExpanded = node.expanded;

    if (isCurrentlyExpanded) {
      for (const childId of node.compositeChildren || []) {
        await this.updateNode(childId, { hidden: true, compositeParent: nodeId });
      }
      return await this.updateNode(nodeId, { expanded: false });
    } else {
      const childCount = node.compositeChildren?.length || 0;
      const centerX = node.position.x;
      const centerY = node.position.y;
      
      const baseRadius = 200;
      const radius = Math.max(baseRadius, baseRadius + (childCount - 3) * 30);
      const spreadAngle = Math.min(180, 60 + childCount * 15);
      const startAngle = -spreadAngle / 2;
      const angleStep = childCount > 1 ? spreadAngle / (childCount - 1) : 0;

      for (let index = 0; index < (node.compositeChildren?.length || 0); index++) {
        const childId = node.compositeChildren![index];
        const angle = (startAngle + angleStep * index) * Math.PI / 180;
        const newX = centerX + Math.cos(angle) * radius;
        const newY = centerY + Math.sin(angle) * radius;
        
        await this.updateNode(childId, { 
          hidden: false, 
          compositeParent: nodeId,
          position: { x: newX, y: newY }
        });
      }
      
      return await this.updateNode(nodeId, { expanded: true });
    }
  }

  /**
   * 创建复合节点
   * @param nodeIds - 要聚合的节点ID列表
   * @param title - 复合节点标题
   * @param userId - 用户ID
   * @returns 创建的复合节点
   */
  async createCompositeNode(nodeIds: string[], title: string, userId?: string): Promise<Node> {
    if (!nodeIds || nodeIds.length < 2) {
      throw new Error('At least 2 nodes are required to create a composite node');
    }

    const nodesToAggregate: Node[] = [];
    for (const id of nodeIds) {
      const node = await this.getNode(id);
      if (node) {
        nodesToAggregate.push(node);
      }
    }

    if (nodesToAggregate.length < 2) {
      throw new Error('At least 2 valid nodes are required');
    }

    const centerX = nodesToAggregate.reduce((sum, n) => sum + n.position.x, 0) / nodesToAggregate.length;
    const centerY = nodesToAggregate.reduce((sum, n) => sum + n.position.y, 0) / nodesToAggregate.length;

    const compositeNode = await this.createNode({
      title: title.trim() || '复合节点',
      isComposite: true,
      compositeChildren: nodeIds,
      position: { x: centerX, y: centerY },
      userId,
    }, userId);

    for (const nodeId of nodeIds) {
      await this.updateNode(nodeId, { 
        hidden: true, 
        compositeParent: compositeNode.id 
      });
    }

    return compositeNode;
  }

  /**
   * 清空所有内存数据
   * 用于测试或重置
   */
  clearMemoryData(): void {
    this.memoryNodes.clear();
    this.memoryRelations = [];
  }
}

export const nodeService = new NodeService();
