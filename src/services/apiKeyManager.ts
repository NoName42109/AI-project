import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

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
    const keysStr = process.env.LLAMA_API_KEYS || process.env.LLAMA_API_KEY || '';
    if (!keysStr) {
      console.warn('[ApiKeyManager] LLAMA_API_KEYS is empty or undefined in environment variables.');
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

    for (let i = 0; i < rawKeys.length; i++) {
      const key = rawKeys[i];
      const maskedKey = key.substring(0, 4) + '****' + key.substring(key.length - 4);
      const docId = `llamacloud_key_${maskedKey}`; // Use masked key as ID to avoid storing full key in DB
      
      try {
        const keyRef = doc(db, 'api_keys', docId);
        const keyDoc = await getDoc(keyRef);

        if (!keyDoc.exists()) {
          // Initialize new key
          const newRecord: ApiKeyRecord = {
            id: docId,
            maskedKey,
            quotaRemainingPercent: 100,
            status: 'active',
            usageCount: 0,
            lastUsed: 0,
            isNew: true
          };
          await setDoc(keyRef, newRecord);
          records.push(newRecord);
        } else {
          const data = keyDoc.data() as ApiKeyRecord;
          // Ensure quota is never 0 if usageCount is 0
          if (data.usageCount === 0 && data.quotaRemainingPercent === 0) {
            data.quotaRemainingPercent = 100;
            data.status = 'active';
            await updateDoc(keyRef, { quotaRemainingPercent: 100, status: 'active' });
          }
          records.push({ ...data, id: docId, maskedKey });
        }
      } catch (error) {
        console.error(`[ApiKeyManager] Error initializing key ${maskedKey}:`, error);
        // Fallback for UI if DB fails
        records.push({
          id: docId,
          maskedKey,
          quotaRemainingPercent: 100,
          status: 'active',
          usageCount: 0,
          lastUsed: 0,
          isNew: true
        });
      }
    }

    return records;
  }

  /**
   * Get an active key for processing
   */
  async getActiveKey(): Promise<{ key: string, docId: string } | null> {
    const rawKeys = this.loadKeysFromEnv();
    if (rawKeys.length === 0) return null;

    for (const key of rawKeys) {
      const maskedKey = key.substring(0, 4) + '****' + key.substring(key.length - 4);
      const docId = `llamacloud_key_${maskedKey.replace(/\*/g, '_')}`;
      
      try {
        // Only try Firestore if it's initialized
        const { isFirebaseInitialized } = await import('./firebase');
        if (isFirebaseInitialized) {
          const keyRef = doc(db, 'api_keys', docId);
          const keyDoc = await getDoc(keyRef);
          
          if (keyDoc.exists()) {
            const data = keyDoc.data();
            if (data.status === 'active' || data.status === 'low_quota') {
              return { key, docId };
            }
            continue; // Try next key if this one is disabled
          }
        }
        
        // If Firestore not initialized or key not in DB, use it as a fresh key
        return { key, docId };
      } catch (error) {
        console.error(`[ApiKeyManager] Error checking key status for ${maskedKey}:`, error);
        // Fallback to use it anyway if DB read fails
        return { key, docId };
      }
    }
    
    return null; // All keys disabled
  }

  /**
   * Update quota based on API response headers or success
   */
  async updateQuotaFromResponse(docId: string, responseHeaders: Headers, isSuccess: boolean) {
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
        
        // Try to parse usage from headers if LlamaCloud provides them
        // Example: x-ratelimit-remaining, x-quota-remaining, etc.
        // If not provided, we just track usageCount and estimate or keep quota at 100% until it fails with 429
        const remainingPages = responseHeaders.get('x-ratelimit-remaining') || responseHeaders.get('x-quota-remaining');
        const totalPages = responseHeaders.get('x-ratelimit-limit') || responseHeaders.get('x-quota-limit');
        
        if (remainingPages && totalPages) {
          const remaining = parseInt(remainingPages, 10);
          const total = parseInt(totalPages, 10);
          if (!isNaN(remaining) && !isNaN(total) && total > 0) {
            newQuota = Math.max(0, (remaining / total) * 100);
          }
        } else if (newQuota === 100 && newUsageCount > 0) {
          // If we can't get exact quota but we used it, we just remove the "isNew" flag essentially
          // We don't artificially reduce quota to 0.
        }
      } else {
        // If it failed with 429 (Too Many Requests) or 402 (Payment Required)
        newQuota = 0;
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
      console.error(`[ApiKeyManager] Error updating quota for ${docId}:`, error);
    }
  }
  
  /**
   * Mark key as exhausted (429/403)
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
