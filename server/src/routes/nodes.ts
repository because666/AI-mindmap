import { Router, Request, Response } from 'express';
import { nodeService } from '../services/nodeService';
import { historyService } from '../services/historyService';
import { optionalAuth } from '../middleware';

const router = Router();

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const nodes = await nodeService.getAllNodes(req.userId);
    const relations = await nodeService.getRelations();
    
    res.json({
      success: true,
      data: { nodes, relations },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const node = await nodeService.createNode(req.body, req.userId);
    await historyService.recordAction('create_node', `创建节点: ${node.title}`, null, node, req.userId);
    
    res.json({ success: true, data: node });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const node = await nodeService.getNode(req.params.id);
    
    if (!node) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    
    res.json({ success: true, data: node });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const before = await nodeService.getNode(req.params.id);
    const node = await nodeService.updateNode(req.params.id, req.body);
    
    if (!node) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    
    await historyService.recordAction('update_node', `更新节点: ${node.title}`, before, node, req.userId);
    
    res.json({ success: true, data: node });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const before = await nodeService.getNode(req.params.id);
    const success = await nodeService.deleteNode(req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    
    await historyService.recordAction('delete_node', `删除节点`, before, null, req.userId);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/child', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const node = await nodeService.createChildNode(req.params.id, title || '新分支', req.userId);
    await historyService.recordAction('create_child', `创建子节点: ${node.title}`, null, node, req.userId);
    
    res.json({ success: true, data: node });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/roots', optionalAuth, async (req: Request, res: Response) => {
  try {
    const nodes = await nodeService.getRootNodes(req.userId);
    res.json({ success: true, data: nodes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
