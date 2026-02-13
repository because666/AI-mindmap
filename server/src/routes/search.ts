import { Router, Request, Response } from 'express';
import { searchService } from '../services/searchService';
import { optionalAuth } from '../middleware';

const router = Router();

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { q, type = 'text', tags } = req.query;
    
    if (!q && !tags) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query parameter "q" or "tags" is required' 
      });
    }
    
    let results;
    
    if (tags) {
      const tagArray = (tags as string).split(',').map(t => t.trim());
      results = await searchService.searchByTags(tagArray, req.userId);
    } else if (type === 'semantic') {
      results = await searchService.semanticSearch(q as string, 20);
    } else if (type === 'hybrid') {
      results = await searchService.hybridSearch(q as string, req.userId);
    } else {
      results = await searchService.searchNodes(q as string, req.userId);
    }
    
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/related/:nodeId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { depth = 2 } = req.query;
    const results = await searchService.getRelatedNodes(
      req.params.nodeId, 
      parseInt(depth as string, 10)
    );
    
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
