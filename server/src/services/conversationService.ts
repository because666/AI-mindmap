import { v4 as uuidv4 } from 'uuid';
import { mongoDBService } from '../data/mongodb/connection';
import { Conversation, Message } from '../types';

class ConversationService {
  private memoryConversations: Map<string, Conversation> = new Map();

  async createConversation(nodeId: string, userId?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: uuidv4(),
      nodeId,
      messages: [],
      contextConfig: {
        includeParentHistory: true,
        includeRelatedNodes: [],
      },
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (mongoDBService.isConnected()) {
      await mongoDBService.insertOne('conversations', conversation);
    }

    this.memoryConversations.set(conversation.id, conversation);
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    if (this.memoryConversations.has(id)) {
      return this.memoryConversations.get(id) || null;
    }

    if (mongoDBService.isConnected()) {
      const conv = await mongoDBService.findOne<Conversation>('conversations', { id } as any);
      if (conv) {
        this.memoryConversations.set(id, conv);
        return conv;
      }
    }

    return null;
  }

  async getConversationByNodeId(nodeId: string): Promise<Conversation | null> {
    for (const conv of this.memoryConversations.values()) {
      if (conv.nodeId === nodeId) return conv;
    }

    if (mongoDBService.isConnected()) {
      const conv = await mongoDBService.findOne<Conversation>('conversations', { nodeId } as any);
      if (conv) {
        this.memoryConversations.set(conv.id, conv);
        return conv;
      }
    }

    return null;
  }

  async addMessage(conversationId: string, message: Omit<Message, '_id' | 'timestamp'>): Promise<Message> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const newMessage: Message = {
      ...message,
      _id: uuidv4(),
      timestamp: new Date(),
    };

    conversation.messages.push(newMessage);
    conversation.updatedAt = new Date();

    if (mongoDBService.isConnected()) {
      await mongoDBService.updateOne('conversations', { id: conversationId } as any, {
        $push: { messages: newMessage },
        $set: { updatedAt: new Date() },
      } as any);
    }

    this.memoryConversations.set(conversationId, conversation);
    return newMessage;
  }

  async clearConversation(conversationId: string): Promise<boolean> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return false;

    conversation.messages = [];
    conversation.updatedAt = new Date();

    if (mongoDBService.isConnected()) {
      await mongoDBService.updateOne('conversations', { id: conversationId } as any, {
        $set: { messages: [], updatedAt: new Date() },
      } as any);
    }

    this.memoryConversations.set(conversationId, conversation);
    return true;
  }

  async updateContextConfig(
    conversationId: string, 
    config: Partial<Conversation['contextConfig']>
  ): Promise<boolean> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return false;

    conversation.contextConfig = {
      ...conversation.contextConfig,
      ...config,
    };
    conversation.updatedAt = new Date();

    if (mongoDBService.isConnected()) {
      await mongoDBService.updateOne('conversations', { id: conversationId } as any, {
        $set: { contextConfig: conversation.contextConfig, updatedAt: new Date() },
      } as any);
    }

    this.memoryConversations.set(conversationId, conversation);
    return true;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const conversation = await this.getConversation(conversationId);
    return conversation?.messages || [];
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return false;

    if (mongoDBService.isConnected()) {
      await mongoDBService.deleteOne('conversations', { id: conversationId } as any);
    }

    this.memoryConversations.delete(conversationId);
    return true;
  }
}

export const conversationService = new ConversationService();
