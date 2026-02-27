import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface ApiKeyRecord {
  id: string;
  maskedKey: string;
  quotaRemainingPercent: number;
  status: 'active' | 'low_quota' | 'disabled';
  usageCount: number;
  lastUsed: number;
  isNew?: boolean;
}

class ApiKeyManager {
  /**
   * 1. Parse ENV correctly
   */
  loadKeysFromEnv(): string[] {
    const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    if (!keysStr) {
      console.warn('[ApiKeyManager] GEMINI_API_KEYS is empty or undefined in environment variables.');
      return [];
    }
    
    return keysStr
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
  }

  /**
   * 2. Initialize missing keys in Firestore
   */
  async initializeMissingKeys(): Promise<ApiKeyRecord[]> {
    const rawKeys = this.loadKeysFromEnv();
    const records: ApiKeyRecord[] = [];

    // Check if Firebase is initialized
    const { isFirebaseInitialized } = await import('./firebase');

    for (let i = 0; i < rawKeys.length; i++) {
      const key = rawKeys[i];
      const maskedKey = key.substring(0, 7) + '****' + key.substring(key.length - 4);
      const docId = `gemini_key_${maskedKey.replace(/\*/g, '_')}`;
      
      const defaultRecord: ApiKeyRecord = {
        id: docId,
        maskedKey,
        quotaRemainingPercent: 100,
        status: 'active',
        usageCount: 0,
        lastUsed: 0,
        isNew: true
      };

      if (!isFirebaseInitialized) {
        records.push(defaultRecord);
        continue;
      }

      try {
        const keyRef = doc(db, 'api_keys', docId);
        const keyDoc = await getDoc(keyRef);

        if (!keyDoc.exists()) {
          await setDoc(keyRef, defaultRecord);
          records.push(defaultRecord);
        } else {
          const data = keyDoc.data() as ApiKeyRecord;
          records.push({ ...data, id: docId, maskedKey });
        }
      } catch (error) {
        console.error(`[ApiKeyManager] Error initializing key ${maskedKey}:`, error);
        records.push(defaultRecord);
      }
    }

    return records;
  }

  /**
   * Cleanup old or invalid API key data from Firestore
   */
  async cleanupOldData() {
    const { isFirebaseInitialized } = await import('./firebase');
    if (!isFirebaseInitialized) return;

    try {
      const { collection, getDocs, deleteDoc } = await import('firebase/firestore');
      const keysCol = collection(db, 'api_keys');
      const snapshot = await getDocs(keysCol);
      
      const rawKeys = this.loadKeysFromEnv();
      const currentDocIds = rawKeys.map(key => {
        const maskedKey = key.substring(0, 7) + '****' + key.substring(key.length - 4);
        return `gemini_key_${maskedKey.replace(/\*/g, '_')}`;
      });

      for (const docSnap of snapshot.docs) {
        if (!currentDocIds.includes(docSnap.id)) {
          console.log(`[ApiKeyManager] Cleaning up old key data: ${docSnap.id}`);
          await deleteDoc(docSnap.ref);
        }
      }
    } catch (error) {
      console.error("[ApiKeyManager] Error during cleanup:", error);
    }
  }

  /**
   * Get an active key for processing
   */
  async getActiveKey(): Promise<{ key: string, docId: string } | null> {
    const rawKeys = this.loadKeysFromEnv();
    if (rawKeys.length === 0) return null;

    for (const key of rawKeys) {
      const maskedKey = key.substring(0, 7) + '****' + key.substring(key.length - 4);
      const docId = `gemini_key_${maskedKey.replace(/\*/g, '_')}`;
      
      try {
        const { isFirebaseInitialized } = await import('./firebase');
        if (isFirebaseInitialized) {
          const keyRef = doc(db, 'api_keys', docId);
          const keyDoc = await getDoc(keyRef);
          
          if (keyDoc.exists()) {
            const data = keyDoc.data();
            if (data.status !== 'disabled') {
              return { key, docId };
            }
            continue;
          }
        }
        return { key, docId };
      } catch (error) {
        console.error(`[ApiKeyManager] Error checking key status:`, error);
        return { key, docId };
      }
    }
    
    return null;
  }

  /**
   * Update usage tracking
   */
  async trackUsage(docId: string, isSuccess: boolean) {
    try {
      const keyRef = doc(db, 'api_keys', docId);
      const keyDoc = await getDoc(keyRef);
      
      if (!keyDoc.exists()) return;
      
      const data = keyDoc.data() as ApiKeyRecord;
      let newUsageCount = data.usageCount;
      let newQuota = data.quotaRemainingPercent;
      let newStatus = data.status;

      if (isSuccess) {
        newUsageCount += 1;
        // Estimate quota: Assuming 1500 requests per key (free tier)
        // This is a rough estimate as requested
        const estimatedLimit = 1500;
        newQuota = Math.max(0, ((estimatedLimit - newUsageCount) / estimatedLimit) * 100);
      } else {
        // If it failed with quota error, we'll handle it in markKeyAsExhausted
      }

      if (newQuota <= 0) newStatus = 'disabled';
      else if (newQuota < 20) newStatus = 'low_quota';
      else newStatus = 'active';

      await updateDoc(keyRef, {
        usageCount: newUsageCount,
        quotaRemainingPercent: newQuota,
        status: newStatus,
        lastUsed: Date.now(),
        isNew: false
      });
      
    } catch (error) {
      console.error(`[ApiKeyManager] Error updating usage for ${docId}:`, error);
    }
  }
  
  /**
   * Mark key as exhausted
   */
  async markKeyAsExhausted(docId: string) {
    try {
      const keyRef = doc(db, 'api_keys', docId);
      await updateDoc(keyRef, {
        quotaRemainingPercent: 0,
        status: 'disabled',
        lastUsed: Date.now(),
        isNew: false
      });
    } catch (error) {
      console.error(`[ApiKeyManager] Error marking key as exhausted:`, error);
    }
  }
}

export const apiKeyManager = new ApiKeyManager();
