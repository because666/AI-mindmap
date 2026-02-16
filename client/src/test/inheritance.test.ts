import { describe, it, expect, beforeEach } from 'vitest';

/**
 * 模拟节点数据结构
 */
interface MockNodeData {
  id: string;
  title: string;
  parentIds: string[];
  childrenIds: string[];
  conversationId: string | null;
  isRoot: boolean;
}

/**
 * 模拟关系数据结构
 */
interface MockRelationData {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
}

/**
 * 模拟消息数据结构
 */
interface MockMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 模拟对话数据结构
 */
interface MockConversation {
  id: string;
  nodeId: string;
  messages: MockMessage[];
}

/**
 * 最大上下文深度
 */
const MAX_CONTEXT_DEPTH = 20;

/**
 * 模拟 getConversationContext 函数
 * 实现完整的多父节点继承和祖先链追溯
 */
const getConversationContext = (
  nodeId: string,
  nodes: Map<string, MockNodeData>,
  conversations: Map<string, MockConversation>,
  relations: MockRelationData[]
): { role: 'user' | 'assistant' | 'system'; content: string }[] => {
  const contextMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
  const visitedNodes = new Set<string>();
  const nodeOrder: string[] = [];

  /**
   * 拓扑排序收集节点顺序
   */
  const collectNodeOrder = (currentNodeId: string, depth: number = 0) => {
    if (visitedNodes.has(currentNodeId) || depth > MAX_CONTEXT_DEPTH) return;
    visitedNodes.add(currentNodeId);

    const currentNode = nodes.get(currentNodeId);
    if (!currentNode) return;

    /**
     * 首先处理所有父节点
     */
    currentNode.parentIds.forEach(parentId => {
      collectNodeOrder(parentId, depth + 1);
    });

    /**
     * 然后处理通过关系连接的源节点
     */
    relations.forEach((relation) => {
      if (relation.targetId === currentNodeId) {
        collectNodeOrder(relation.sourceId, depth + 1);
      }
    });

    nodeOrder.push(currentNodeId);
  };

  collectNodeOrder(nodeId);

  /**
   * 按拓扑顺序收集消息
   */
  nodeOrder.forEach(orderedNodeId => {
    const node = nodes.get(orderedNodeId);
    if (!node) return;

    if (node.conversationId) {
      const conv = conversations.get(node.conversationId);
      if (conv && conv.messages.length > 0) {
        contextMessages.push({
          role: 'system',
          content: `[节点: ${node.title}]`
        });
        conv.messages.forEach(msg => {
          contextMessages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }
    }
  });

  return contextMessages;
};

describe('Multi-Parent Node Inheritance', () => {
  let nodes: Map<string, MockNodeData>;
  let conversations: Map<string, MockConversation>;
  let relations: MockRelationData[];

  beforeEach(() => {
    nodes = new Map();
    conversations = new Map();
    relations = [];
  });

  describe('Single Parent Inheritance', () => {
    it('should inherit context from single parent node', () => {
      /**
       * 设置节点结构: Parent -> Child
       */
      nodes.set('parent', {
        id: 'parent',
        title: 'Parent Node',
        parentIds: [],
        childrenIds: ['child'],
        conversationId: 'conv-parent',
        isRoot: true
      });

      nodes.set('child', {
        id: 'child',
        title: 'Child Node',
        parentIds: ['parent'],
        childrenIds: [],
        conversationId: 'conv-child',
        isRoot: false
      });

      conversations.set('conv-parent', {
        id: 'conv-parent',
        nodeId: 'parent',
        messages: [
          { role: 'user', content: 'Parent question' },
          { role: 'assistant', content: 'Parent answer' }
        ]
      });

      conversations.set('conv-child', {
        id: 'conv-child',
        nodeId: 'child',
        messages: [
          { role: 'user', content: 'Child question' }
        ]
      });

      const context = getConversationContext('child', nodes, conversations, relations);

      /**
       * 验证父节点消息在子节点之前
       */
      expect(context.length).toBe(5);
      expect(context[0]).toEqual({ role: 'system', content: '[节点: Parent Node]' });
      expect(context[1]).toEqual({ role: 'user', content: 'Parent question' });
      expect(context[2]).toEqual({ role: 'assistant', content: 'Parent answer' });
      expect(context[3]).toEqual({ role: 'system', content: '[节点: Child Node]' });
      expect(context[4]).toEqual({ role: 'user', content: 'Child question' });
    });
  });

  describe('Multi-Parent Inheritance', () => {
    it('should inherit context from multiple parent nodes', () => {
      /**
       * 设置节点结构:
       *   Parent1 ─┐
       *            ├─> Child
       *   Parent2 ─┘
       */
      nodes.set('parent1', {
        id: 'parent1',
        title: 'Parent 1',
        parentIds: [],
        childrenIds: ['child'],
        conversationId: 'conv-p1',
        isRoot: true
      });

      nodes.set('parent2', {
        id: 'parent2',
        title: 'Parent 2',
        parentIds: [],
        childrenIds: ['child'],
        conversationId: 'conv-p2',
        isRoot: true
      });

      nodes.set('child', {
        id: 'child',
        title: 'Multi-Parent Child',
        parentIds: ['parent1', 'parent2'],
        childrenIds: [],
        conversationId: 'conv-child',
        isRoot: false
      });

      conversations.set('conv-p1', {
        id: 'conv-p1',
        nodeId: 'parent1',
        messages: [
          { role: 'user', content: 'P1 question' },
          { role: 'assistant', content: 'P1 answer' }
        ]
      });

      conversations.set('conv-p2', {
        id: 'conv-p2',
        nodeId: 'parent2',
        messages: [
          { role: 'user', content: 'P2 question' },
          { role: 'assistant', content: 'P2 answer' }
        ]
      });

      conversations.set('conv-child', {
        id: 'conv-child',
        nodeId: 'child',
        messages: [
          { role: 'user', content: 'Child question' }
        ]
      });

      const context = getConversationContext('child', nodes, conversations, relations);

      /**
       * 验证两个父节点的消息都被继承
       * Parent1: 1 system + 2 messages = 3
       * Parent2: 1 system + 2 messages = 3  
       * Child: 1 system + 1 message = 2
       * 总共: 3 + 3 + 2 = 8
       */
      expect(context.length).toBe(8);
      
      /**
       * 验证父节点消息在子节点之前
       */
      const parent1Index = context.findIndex(m => m.content === '[节点: Parent 1]');
      const parent2Index = context.findIndex(m => m.content === '[节点: Parent 2]');
      const childIndex = context.findIndex(m => m.content === '[节点: Multi-Parent Child]');
      
      expect(parent1Index).toBeLessThan(childIndex);
      expect(parent2Index).toBeLessThan(childIndex);
      
      /**
       * 验证子节点消息在最后
       */
      expect(context[context.length - 1]).toEqual({ role: 'user', content: 'Child question' });
    });
  });

  describe('Ancestor Chain Inheritance', () => {
    it('should inherit context from entire ancestor chain', () => {
      /**
       * 设置节点结构: GrandParent -> Parent -> Child
       */
      nodes.set('grandparent', {
        id: 'grandparent',
        title: 'GrandParent',
        parentIds: [],
        childrenIds: ['parent'],
        conversationId: 'conv-gp',
        isRoot: true
      });

      nodes.set('parent', {
        id: 'parent',
        title: 'Parent',
        parentIds: ['grandparent'],
        childrenIds: ['child'],
        conversationId: 'conv-p',
        isRoot: false
      });

      nodes.set('child', {
        id: 'child',
        title: 'Child',
        parentIds: ['parent'],
        childrenIds: [],
        conversationId: 'conv-child',
        isRoot: false
      });

      conversations.set('conv-gp', {
        id: 'conv-gp',
        nodeId: 'grandparent',
        messages: [
          { role: 'user', content: 'GP question' },
          { role: 'assistant', content: 'GP answer' }
        ]
      });

      conversations.set('conv-p', {
        id: 'conv-p',
        nodeId: 'parent',
        messages: [
          { role: 'user', content: 'P question' },
          { role: 'assistant', content: 'P answer' }
        ]
      });

      conversations.set('conv-child', {
        id: 'conv-child',
        nodeId: 'child',
        messages: [
          { role: 'user', content: 'Child question' }
        ]
      });

      const context = getConversationContext('child', nodes, conversations, relations);

      /**
       * 验证祖先链完整继承
       * GrandParent: 1 system + 2 messages = 3
       * Parent: 1 system + 2 messages = 3
       * Child: 1 system + 1 message = 2
       * 总共: 3 + 3 + 2 = 8
       */
      expect(context.length).toBe(8);
      
      /**
       * 验证顺序: GrandParent -> Parent -> Child
       */
      expect(context[0]).toEqual({ role: 'system', content: '[节点: GrandParent]' });
      expect(context[2]).toEqual({ role: 'assistant', content: 'GP answer' });
      expect(context[3]).toEqual({ role: 'system', content: '[节点: Parent]' });
      expect(context[5]).toEqual({ role: 'assistant', content: 'P answer' });
      expect(context[6]).toEqual({ role: 'system', content: '[节点: Child]' });
    });

    it('should handle complex multi-branch ancestor chains', () => {
      /**
       * 设置复杂的多分支祖先链:
       *   GP1 ──┬──> P1 ──┐
       *         │         ├──> Child
       *   GP2 ──┴──> P2 ──┘
       */
      nodes.set('gp1', {
        id: 'gp1',
        title: 'GrandParent 1',
        parentIds: [],
        childrenIds: ['p1'],
        conversationId: 'conv-gp1',
        isRoot: true
      });

      nodes.set('gp2', {
        id: 'gp2',
        title: 'GrandParent 2',
        parentIds: [],
        childrenIds: ['p2'],
        conversationId: 'conv-gp2',
        isRoot: true
      });

      nodes.set('p1', {
        id: 'p1',
        title: 'Parent 1',
        parentIds: ['gp1'],
        childrenIds: ['child'],
        conversationId: 'conv-p1',
        isRoot: false
      });

      nodes.set('p2', {
        id: 'p2',
        title: 'Parent 2',
        parentIds: ['gp2'],
        childrenIds: ['child'],
        conversationId: 'conv-p2',
        isRoot: false
      });

      nodes.set('child', {
        id: 'child',
        title: 'Complex Child',
        parentIds: ['p1', 'p2'],
        childrenIds: [],
        conversationId: 'conv-child',
        isRoot: false
      });

      conversations.set('conv-gp1', {
        id: 'conv-gp1',
        nodeId: 'gp1',
        messages: [{ role: 'user', content: 'GP1 msg' }]
      });

      conversations.set('conv-gp2', {
        id: 'conv-gp2',
        nodeId: 'gp2',
        messages: [{ role: 'user', content: 'GP2 msg' }]
      });

      conversations.set('conv-p1', {
        id: 'conv-p1',
        nodeId: 'p1',
        messages: [{ role: 'user', content: 'P1 msg' }]
      });

      conversations.set('conv-p2', {
        id: 'conv-p2',
        nodeId: 'p2',
        messages: [{ role: 'user', content: 'P2 msg' }]
      });

      conversations.set('conv-child', {
        id: 'conv-child',
        nodeId: 'child',
        messages: [{ role: 'user', content: 'Child msg' }]
      });

      const context = getConversationContext('child', nodes, conversations, relations);

      /**
       * 验证所有祖先节点都被继承
       */
      const nodeTitles = context
        .filter(m => m.role === 'system')
        .map(m => m.content);
      
      /**
       * 验证所有祖先节点都存在
       */
      expect(nodeTitles).toContain('[节点: GrandParent 1]');
      expect(nodeTitles).toContain('[节点: GrandParent 2]');
      expect(nodeTitles).toContain('[节点: Parent 1]');
      expect(nodeTitles).toContain('[节点: Parent 2]');
      expect(nodeTitles).toContain('[节点: Complex Child]');
      
      /**
       * 验证子节点在最后
       */
      expect(nodeTitles[nodeTitles.length - 1]).toBe('[节点: Complex Child]');
    });
  });

  describe('Relation-Based Inheritance', () => {
    it('should inherit context from relation-connected nodes', () => {
      /**
       * 设置节点结构和关系:
       *   NodeA --[supports]--> NodeB
       */
      nodes.set('nodeA', {
        id: 'nodeA',
        title: 'Node A',
        parentIds: [],
        childrenIds: [],
        conversationId: 'conv-a',
        isRoot: true
      });

      nodes.set('nodeB', {
        id: 'nodeB',
        title: 'Node B',
        parentIds: [],
        childrenIds: [],
        conversationId: 'conv-b',
        isRoot: true
      });

      relations.push({
        id: 'rel-1',
        sourceId: 'nodeA',
        targetId: 'nodeB',
        type: 'supports'
      });

      conversations.set('conv-a', {
        id: 'conv-a',
        nodeId: 'nodeA',
        messages: [
          { role: 'user', content: 'A question' },
          { role: 'assistant', content: 'A answer' }
        ]
      });

      conversations.set('conv-b', {
        id: 'conv-b',
        nodeId: 'nodeB',
        messages: [
          { role: 'user', content: 'B question' }
        ]
      });

      const context = getConversationContext('nodeB', nodes, conversations, relations);

      /**
       * 验证关系连接的节点上下文被继承
       */
      expect(context.length).toBe(5);
      expect(context[0]).toEqual({ role: 'system', content: '[节点: Node A]' });
      expect(context[2]).toEqual({ role: 'assistant', content: 'A answer' });
      expect(context[3]).toEqual({ role: 'system', content: '[节点: Node B]' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle node without conversation', () => {
      nodes.set('parent', {
        id: 'parent',
        title: 'Parent',
        parentIds: [],
        childrenIds: ['child'],
        conversationId: null,
        isRoot: true
      });

      nodes.set('child', {
        id: 'child',
        title: 'Child',
        parentIds: ['parent'],
        childrenIds: [],
        conversationId: 'conv-child',
        isRoot: false
      });

      conversations.set('conv-child', {
        id: 'conv-child',
        nodeId: 'child',
        messages: [{ role: 'user', content: 'Child msg' }]
      });

      const context = getConversationContext('child', nodes, conversations, relations);

      /**
       * 验证无对话的父节点不影响继承
       */
      expect(context.length).toBe(2);
      expect(context[0]).toEqual({ role: 'system', content: '[节点: Child]' });
    });

    it('should handle circular references gracefully', () => {
      /**
       * 设置循环引用: A -> B -> A
       */
      nodes.set('nodeA', {
        id: 'nodeA',
        title: 'Node A',
        parentIds: ['nodeB'],
        childrenIds: ['nodeB'],
        conversationId: 'conv-a',
        isRoot: false
      });

      nodes.set('nodeB', {
        id: 'nodeB',
        title: 'Node B',
        parentIds: ['nodeA'],
        childrenIds: ['nodeA'],
        conversationId: 'conv-b',
        isRoot: false
      });

      conversations.set('conv-a', {
        id: 'conv-a',
        nodeId: 'nodeA',
        messages: [{ role: 'user', content: 'A msg' }]
      });

      conversations.set('conv-b', {
        id: 'conv-b',
        nodeId: 'nodeB',
        messages: [{ role: 'user', content: 'B msg' }]
      });

      /**
       * 验证循环引用不会导致无限循环
       */
      const context = getConversationContext('nodeA', nodes, conversations, relations);
      expect(context.length).toBeGreaterThan(0);
    });

    it('should handle non-existent node', () => {
      const context = getConversationContext('non-existent', nodes, conversations, relations);
      expect(context.length).toBe(0);
    });
  });
});

describe('Edge Rendering', () => {
  /**
   * 测试边数据生成逻辑
   */
  it('should create valid edge data from relations', () => {
    const relations = [
      { id: 'r1', sourceId: 'a', targetId: 'b', type: 'parent-child' },
      { id: 'r2', sourceId: 'b', targetId: 'c', type: 'supports' }
    ];

    const visibleNodeIds = new Set(['a', 'b', 'c']);

    const edges = relations
      .filter(r => visibleNodeIds.has(r.sourceId) && visibleNodeIds.has(r.targetId))
      .map(r => ({
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        type: 'smoothstep'
      }));

    expect(edges.length).toBe(2);
    expect(edges[0].source).toBe('a');
    expect(edges[0].target).toBe('b');
    expect(edges[1].source).toBe('b');
    expect(edges[1].target).toBe('c');
  });

  it('should filter edges for hidden nodes', () => {
    const relations = [
      { id: 'r1', sourceId: 'a', targetId: 'b', type: 'parent-child' },
      { id: 'r2', sourceId: 'b', targetId: 'c', type: 'supports' }
    ];

    const visibleNodeIds = new Set(['a', 'b']);

    const edges = relations
      .filter(r => visibleNodeIds.has(r.sourceId) && visibleNodeIds.has(r.targetId))
      .map(r => ({
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        type: 'smoothstep'
      }));

    expect(edges.length).toBe(1);
    expect(edges[0].id).toBe('r1');
  });
});
