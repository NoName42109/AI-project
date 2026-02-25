import { db } from '../../src/services/firebase';
import { collection, query, where, getDocs, doc, runTransaction, updateDoc, orderBy, limit } from 'firebase/firestore';

export interface ApiKeyRecord {
  id: string;
  service: string;
  key: string;
  maskedKey: string;
  quotaRemainingPercent: number;
  status: 'active' | 'standby' | 'low_quota' | 'disabled';
  usageCount: number;
}

export const apiKeyManager = {
  /**
   * Lấy API Key khả dụng tốt nhất. Ưu tiên 'active', sau đó đến 'standby', cuối cùng là 'low_quota'.
   */
  async getActiveKey(serviceType: string): Promise<ApiKeyRecord> {
    const keysRef = collection(db, 'api_keys');
    
    // 1. Thử lấy key 'active'
    let q = query(keysRef, where('service', '==', serviceType), where('status', '==', 'active'), orderBy('quotaRemainingPercent', 'desc'), limit(1));
    let snapshot = await getDocs(q);

    // 2. Nếu không có active, lấy 'standby' để rotate
    if (snapshot.empty) {
      q = query(keysRef, where('service', '==', serviceType), where('status', '==', 'standby'), limit(1));
      snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const standbyKey = snapshot.docs[0];
        await updateDoc(standbyKey.ref, { status: 'active' });
        return { id: standbyKey.id, ...standbyKey.data() } as ApiKeyRecord;
      }
    }

    // 3. Nếu không có standby, cắn răng dùng 'low_quota'
    if (snapshot.empty) {
      q = query(keysRef, where('service', '==', serviceType), where('status', '==', 'low_quota'), orderBy('quotaRemainingPercent', 'desc'), limit(1));
      snapshot = await getDocs(q);
    }

    if (snapshot.empty) {
      console.error(`[API Manager] CRITICAL: Tất cả API key cho ${serviceType} đã hết quota!`);
      throw new Error('Tất cả API key đã hết quota. Vui lòng liên hệ Admin.');
    }

    const docData = snapshot.docs[0];
    return { id: docData.id, ...docData.data() } as ApiKeyRecord;
  },

  /**
   * Cập nhật Quota sau mỗi request. Tự động Rotate nếu < 20%
   */
  async updateQuotaAndRotateIfNeeded(keyId: string, remainingPercent: number) {
    const keyRef = doc(db, 'api_keys', keyId);

    await runTransaction(db, async (transaction) => {
      const keyDoc = await transaction.get(keyRef);
      if (!keyDoc.exists()) return;

      const currentData = keyDoc.data() as ApiKeyRecord;
      let newStatus = currentData.status;

      if (remainingPercent <= 0) {
        newStatus = 'disabled';
        console.warn(`[API Manager] Key ${currentData.maskedKey} đã cạn kiệt. Disabled.`);
      } else if (remainingPercent < 20) {
        newStatus = 'low_quota';
        console.warn(`[API Manager] Key ${currentData.maskedKey} còn dưới 20%. Chuyển sang Low Quota.`);
      }

      transaction.update(keyRef, {
        quotaRemainingPercent: remainingPercent,
        status: newStatus,
        usageCount: (currentData.usageCount || 0) + 1,
        lastUsed: Date.now()
      });
    });
  },

  /**
   * Vô hiệu hóa key ngay lập tức (dùng khi nhận mã lỗi 401, 429 từ Provider)
   */
  async disableKey(keyId: string, reason: string) {
    console.error(`[API Manager] Disabling key ${keyId} due to: ${reason}`);
    const keyRef = doc(db, 'api_keys', keyId);
    await updateDoc(keyRef, { status: 'disabled', quotaRemainingPercent: 0 });
  }
};
