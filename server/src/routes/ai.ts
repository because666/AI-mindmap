import { Router, Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { optionalAuth } from '../middleware';
import { AIRequest } from '../types';

const router = Router();

router.post('/chat', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { messages, model, temperature, maxTokens } = req.body as AIRequest;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required',
      });
    }
    
    const result = await aiService.chat({
      messages,
      model,
      temperature,
      maxTokens,
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/models', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ],
  });
});

router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    configured: aiService.isConfigured(),
  });
});

export default router;
