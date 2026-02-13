import { nodeService } from './nodeService';
import { aiService } from './aiService';
import { SearchResult } from '../types';

class SearchService {
  async searchNodes(query: string, userId?: string): Promise<SearchResult[]> {
    const nodes = await nodeService.getAllNodes(userId);
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const node of nodes) {
      const matches: string[] = [];
      let score = 0;

      if (node.title.toLowerCase().includes(queryLower)) {
        matches.push('title');
        score += 10;
      }

      if (node.summary.toLowerCase().includes(queryLower)) {
        matches.push('summary');
        score += 5;
      }

      const tagMatches = node.tags.filter(tag => 
        tag.toLowerCase().includes(queryLower)
      );
      if (tagMatches.length > 0) {
        matches.push('tags');
        score += 3 * tagMatches.length;
      }

      if (matches.length > 0) {
        results.push({
          nodeId: node.id,
          score,
          matches,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async semanticSearch(query: string, topK: number = 10): Promise<SearchResult[]> {
    if (!aiService.isConfigured()) {
      console.warn('AI service not configured, falling back to text search');
      return this.searchNodes(query);
    }

    const similarNodes = await aiService.searchSimilarNodes(query, topK);
    
    return similarNodes.map(node => ({
      nodeId: node.id,
      score: node.score,
      matches: ['semantic'],
      highlights: node.metadata?.content ? { content: [node.metadata.content] } : undefined,
    }));
  }

  async hybridSearch(query: string, userId?: string): Promise<SearchResult[]> {
    const textResults = await this.searchNodes(query, userId);
    
    let semanticResults: SearchResult[] = [];
    if (aiService.isConfigured()) {
      semanticResults = await this.semanticSearch(query, 5);
    }

    const mergedMap = new Map<string, SearchResult>();

    for (const result of textResults) {
      mergedMap.set(result.nodeId, result);
    }

    for (const result of semanticResults) {
      const existing = mergedMap.get(result.nodeId);
      if (existing) {
        existing.score += result.score * 0.5;
        existing.matches = [...new Set([...existing.matches, ...result.matches])];
      } else {
        mergedMap.set(result.nodeId, result);
      }
    }

    return Array.from(mergedMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  async searchByTags(tags: string[], userId?: string): Promise<SearchResult[]> {
    const nodes = await nodeService.getAllNodes(userId);
    const results: SearchResult[] = [];

    for (const node of nodes) {
      const matchingTags = node.tags.filter(tag => 
        tags.some(searchTag => 
          tag.toLowerCase().includes(searchTag.toLowerCase())
        )
      );

      if (matchingTags.length > 0) {
        results.push({
          nodeId: node.id,
          score: matchingTags.length,
          matches: ['tags'],
          highlights: { tags: matchingTags },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async getRelatedNodes(nodeId: string, depth: number = 2): Promise<SearchResult[]> {
    const visited = new Set<string>();
    const results: SearchResult[] = [];

    const traverse = async (id: string, currentDepth: number) => {
      if (visited.has(id) || currentDepth > depth) return;
      visited.add(id);

      const relations = await nodeService.getRelationsForNode(id);
      
      for (const relation of relations) {
        const relatedId = relation.sourceId === id ? relation.targetId : relation.sourceId;
        
        if (!visited.has(relatedId)) {
          const node = await nodeService.getNode(relatedId);
          if (node) {
            results.push({
              nodeId: node.id,
              score: 1 / currentDepth,
              matches: [relation.type],
            });
          }
          
          await traverse(relatedId, currentDepth + 1);
        }
      }
    };

    await traverse(nodeId, 1);
    return results;
  }
}

export const searchService = new SearchService();
