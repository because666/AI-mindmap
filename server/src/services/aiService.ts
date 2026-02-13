import OpenAI from 'openai';
import { config } from '../config';
import { AIRequest, AIResponse, EmbeddingRequest, EmbeddingResponse } from '../types';
import { vectorDBService } from '../data/vector/connection';

class AIService {
  private openai: OpenAI | null = null;
  private static instance: AIService;

  private constructor() {
    if (config.ai.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.ai.openaiApiKey });
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    if (!this.openai) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    try {
      const model = request.model || config.ai.defaultModel;
      const response = await this.openai.chat.completions.create({
        model,
        messages: request.messages.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: false,
      });

      const choice = response.choices[0];
      return {
        success: true,
        content: choice.message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  async *chatStream(request: AIRequest): AsyncGenerator<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const model = request.model || config.ai.defaultModel;
    const stream = await this.openai.chat.completions.create({
      model,
      messages: request.messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  async getEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.openai) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    try {
      const model = request.model || config.ai.embeddingModel;
      const response = await this.openai.embeddings.create({
        model,
        input: request.text,
      });

      const embedding = response.data[0].embedding;
      return {
        success: true,
        embedding,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  async indexNodeContent(nodeId: string, content: string, metadata: Record<string, any> = {}): Promise<void> {
    const embeddingResponse = await this.getEmbedding({ text: content });
    
    if (embeddingResponse.success && embeddingResponse.embedding) {
      await vectorDBService.insertVector(nodeId, embeddingResponse.embedding, {
        ...metadata,
        content: content.substring(0, 500),
        indexedAt: new Date(),
      });
    }
  }

  async searchSimilarNodes(query: string, topK: number = 10): Promise<Array<{ id: string; score: number; metadata: Record<string, any> }>> {
    const embeddingResponse = await this.getEmbedding({ text: query });
    
    if (!embeddingResponse.success || !embeddingResponse.embedding) {
      return [];
    }

    return await vectorDBService.searchSimilar(embeddingResponse.embedding, topK);
  }

  isConfigured(): boolean {
    return this.openai !== null;
  }
}

export const aiService = AIService.getInstance();
