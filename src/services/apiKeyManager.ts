import { db } from './firebase.js';
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
    const { isFirebaseInitialized } = await import('./firebase.js');

    // 2a. Process Env Keys
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

    // 2b. Fetch Custom Keys from Firestore
    if (isFirebaseInitialized) {
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const customKeysCol = collection(db, 'custom_api_keys');
        const snapshot = await getDocs(customKeysCol);
        
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          records.push({
            id: docSnap.id,
            maskedKey: data.maskedKey,
            quotaRemainingPercent: data.quotaRemainingPercent,
            status: data.status,
            usageCount: data.usageCount,
            lastUsed: data.lastUsed,
            isNew: false
          });
        });
      } catch (error) {
        console.error("[ApiKeyManager] Error fetching custom keys:", error);
      }
    }

    return records;
  }

  /**
   * Cleanup old or invalid API key data from Firestore
   */
  async cleanupOldData() {
    const { isFirebaseInitialized } = await import('./firebase.js');
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
   * Add a custom API key to Firestore
   */
  async addCustomKey(rawKey: string): Promise<void> {
    const { isFirebaseInitialized } = await import('./firebase.js');
    if (!isFirebaseInitialized) throw new Error("Firebase not initialized");

    const maskedKey = rawKey.substring(0, 7) + '****' + rawKey.substring(rawKey.length - 4);
    const docId = `custom_key_${Date.now()}`;

    const newRecord = {
      key: rawKey, // Store the actual key for server use
      maskedKey,
      quotaRemainingPercent: 100,
      status: 'active',
      usageCount: 0,
      lastUsed: 0,
      createdAt: Date.now()
    };

    const { collection, doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'custom_api_keys', docId), newRecord);
  }

  /**
   * Delete a custom API key from Firestore
   */
  async deleteCustomKey(docId: string): Promise<void> {
    const { isFirebaseInitialized } = await import('./firebase.js');
    if (!isFirebaseInitialized) throw new Error("Firebase not initialized");

    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'custom_api_keys', docId));
  }

  /**
   * Get an active key for processing (Env + Custom)
   */
  async getActiveKey(): Promise<{ key: string, docId: string, isCustom?: boolean } | null> {
    // 1. Try Env Keys first
    const rawKeys = this.loadKeysFromEnv();
    for (const key of rawKeys) {
      const maskedKey = key.substring(0, 7) + '****' + key.substring(key.length - 4);
      const docId = `gemini_key_${maskedKey.replace(/\*/g, '_')}`;
      
      try {
        const { isFirebaseInitialized } = await import('./firebase.js');
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

    // 2. Try Custom Keys from Firestore
    try {
      const { isFirebaseInitialized } = await import('./firebase.js');
      if (isFirebaseInitialized) {
        const { collection, getDocs, query, where, limit } = await import('firebase/firestore');
        const customKeysCol = collection(db, 'custom_api_keys');
        const q = query(customKeysCol, where('status', '!=', 'disabled'), limit(5));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          return { key: data.key, docId: docSnap.id, isCustom: true };
        }
      }
    } catch (error) {
      console.error("[ApiKeyManager] Error fetching active custom key:", error);
    }
    
    return null;
  }

  /**
   * Update usage tracking
   */
  async trackUsage(docId: string, isSuccess: boolean, isCustom: boolean = false) {
    try {
      const collectionName = isCustom ? 'custom_api_keys' : 'api_keys';
      const keyRef = doc(db, collectionName, docId);
      const keyDoc = await getDoc(keyRef);
      
      if (!keyDoc.exists()) return;
      
      const data = keyDoc.data() as ApiKeyRecord;
      let newUsageCount = data.usageCount;
      let newQuota = data.quotaRemainingPercent;
      let newStatus = data.status;

      if (isSuccess) {
        newUsageCount += 1;
        const estimatedLimit = 1500;
        newQuota = Math.max(0, ((estimatedLimit - newUsageCount) / estimatedLimit) * 100);
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
  async markKeyAsExhausted(docId: string, isCustom: boolean = false) {
    try {
      const collectionName = isCustom ? 'custom_api_keys' : 'api_keys';
      const keyRef = doc(db, collectionName, docId);
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
