import { Router, Request, Response } from 'express';
import { conversationService } from '../services/conversationService';
import { nodeService } from '../services/nodeService';
import { aiService } from '../services/aiService';
import { optionalAuth } from '../middleware';

const router = Router();

router.get('/:nodeId', optionalAuth, async (req: Request, res: Response) => {
  try {
    let conversation = await conversationService.getConversationByNodeId(req.params.nodeId);
    
    if (!conversation) {
      conversation = await conversationService.createConversation(req.params.nodeId, req.userId);
    }
    
    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:nodeId/message', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { content, role = 'user' } = req.body;
    
    let conversation = await conversationService.getConversationByNodeId(req.params.nodeId);
    
    if (!conversation) {
      conversation = await conversationService.createConversation(req.params.nodeId, req.userId);
    }
    
    await conversationService.addMessage(conversation.id, { role, content });
    
    if (role === 'user') {
      const contextMessages = await buildContextMessages(req.params.nodeId);
      contextMessages.push({ role: 'user', content });
      
      const aiResponse = await aiService.chat({
        messages: contextMessages,
        model: req.body.model,
        temperature: req.body.temperature,
      });
      
      if (aiResponse.success && aiResponse.content) {
        await conversationService.addMessage(conversation.id, { 
          role: 'assistant', 
          content: aiResponse.content 
        });
      }
      
      return res.json({ 
        success: true, 
        data: { 
          userMessage: content,
          assistantMessage: aiResponse.content,
          error: aiResponse.error,
        } 
      });
    }
    
    res.json({ success: true, data: { message: content } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:nodeId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const conversation = await conversationService.getConversationByNodeId(req.params.nodeId);
    
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    await conversationService.clearConversation(conversation.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function buildContextMessages(nodeId: string): Promise<Array<{ role: string; content: string }>> {
  const messages: Array<{ role: string; content: string }> = [];
  const visited = new Set<string>();
  
  const collectContext = async (id: string, depth: number = 0) => {
    if (visited.has(id) || depth > 10) return;
    visited.add(id);
    
    const node = await nodeService.getNode(id);
    if (!node) return;
    
    for (const parentId of node.parentIds) {
      await collectContext(parentId, depth + 1);
    }
    
    if (node.conversationId) {
      const conv = await conversationService.getConversation(node.conversationId);
      if (conv && conv.messages.length > 0) {
        messages.push({
          role: 'system',
          content: `[节点: ${node.title}]`,
        });
        
        for (const msg of conv.messages) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }
  };
  
  await collectContext(nodeId);
  return messages;
}

export default router;
