import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface UsageLog {
  llama_used: number;
  llama_total: number;
  llama_remaining_percent: number;
  health: 'ok' | 'warning' | 'critical';
  timestamp: number;
  date_string: string;
}

export const usageService = {
  /**
   * Lưu lịch sử usage theo ngày vào Firestore
   */
  async logUsage(data: UsageLog): Promise<void> {
    try {
      await addDoc(collection(db, 'api_usage_logs'), {
        ...data,
        timestamp: Date.now(),
        date_string: new Date().toISOString().split('T')[0] // YYYY-MM-DD
      });
    } catch (error) {
      console.error("Lỗi khi lưu log usage vào Firestore:", error);
    }
  }
};
