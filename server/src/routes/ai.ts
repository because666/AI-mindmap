import { Router, Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { optionalAuth } from '../middleware';
import { AIRequest } from '../types';

const router = Router();

router.post('/chat', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { messages, config, model, temperature, maxTokens } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required',
      });
    }
    
    const chatModel = config?.model || model;
    const chatProvider = config?.provider;
    const apiKey = config?.apiKey;
    const baseUrl = config?.baseUrl;
    
    const result = await aiService.chat({
      messages,
      model: chatModel,
      temperature,
      maxTokens,
      provider: chatProvider,
      apiKey,
      baseUrl,
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { provider, model, apiKey, baseUrl } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API Key is required',
      });
    }
    
    const result = await aiService.testConnection({
      provider,
      model,
      apiKey,
      baseUrl,
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
