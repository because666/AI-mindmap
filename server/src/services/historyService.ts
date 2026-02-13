import { v4 as uuidv4 } from 'uuid';
import { mongoDBService } from '../data/mongodb/connection';
import { HistoryRecord } from '../types';

class HistoryService {
  private memoryHistory: HistoryRecord[] = [];
  private maxHistorySize = 100;

  async recordAction(
    action: string, 
    description: string, 
    beforeState?: any, 
    afterState?: any,
    userId?: string
  ): Promise<HistoryRecord> {
    const record: HistoryRecord = {
      id: uuidv4(),
      userId,
      action,
      description,
      beforeState,
      afterState,
      timestamp: new Date(),
    };

    if (mongoDBService.isConnected()) {
      await mongoDBService.insertOne('history', record);
    }

    this.memoryHistory.push(record);
    
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }

    return record;
  }

  async getHistory(limit: number = 50, userId?: string): Promise<HistoryRecord[]> {
    let history = [...this.memoryHistory];
    
    if (userId) {
      history = history.filter(h => h.userId === userId);
    }

    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getHistoryByAction(action: string, userId?: string): Promise<HistoryRecord[]> {
    let history = this.memoryHistory.filter(h => h.action === action);
    
    if (userId) {
      history = history.filter(h => h.userId === userId);
    }

    return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async clearHistory(userId?: string): Promise<void> {
    if (userId) {
      this.memoryHistory = this.memoryHistory.filter(h => h.userId !== userId);
      
      if (mongoDBService.isConnected()) {
        await mongoDBService.deleteMany('history', { userId } as any);
      }
    } else {
      this.memoryHistory = [];
      
      if (mongoDBService.isConnected()) {
        await mongoDBService.deleteMany('history', {} as any);
      }
    }
  }

  async undoLastAction(userId?: string): Promise<{ beforeState: any; afterState: any } | null> {
    const history = await this.getHistory(1, userId);
    if (history.length === 0) return null;

    const lastAction = history[0];
    return {
      beforeState: lastAction.beforeState,
      afterState: lastAction.afterState,
    };
  }
}

export const historyService = new HistoryService();
