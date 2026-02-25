import { collection, getDocs, query, where, updateDoc, doc, increment } from 'firebase/firestore';
// Lưu ý: Trong môi trường production server-side, sử dụng firebase-admin
// Ở đây dùng firebase client SDK mô phỏng cho Vercel Edge tương thích
import { db } from '../../src/services/firebase'; 

export interface ApiKeyDoc {
  id: string;
  type: string;
  key: string;
  total_quota: number;
  used_quota: number;
  is_active: boolean;
}

const QUOTA_THRESHOLD = 0.2; // 20%

export const apiKeyManager = {
  /**
   * 1. Tính phần trăm quota còn lại
   */
  getRemainingQuota(keyDoc: ApiKeyDoc): number {
    if (keyDoc.total_quota <= 0) return 0;
    return (keyDoc.total_quota - keyDoc.used_quota) / keyDoc.total_quota;
  },

  /**
   * 2. Lấy Key đang active. Nếu dưới 20% thì tự động switch.
   */
  async getActiveKey(type: string): Promise<ApiKeyDoc> {
    const q = query(collection(db, 'api_keys'), where('type', '==', type), where('is_active', '==', true));
    const snapshot = await getDocs(q);

    let activeKey: ApiKeyDoc | null = null;

    if (!snapshot.empty) {
      activeKey = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ApiKeyDoc;
      
      // Kiểm tra quota hiện tại
      const remaining = this.getRemainingQuota(activeKey);
      if (remaining >= QUOTA_THRESHOLD) {
        return activeKey;
      }
    }

    // Nếu không có key active hoặc key active < 20% -> Thực hiện switch
    return await this.switchKeyIfLowQuota(type);
  },

  /**
   * 3. Tìm key có quota cao nhất và switch sang key đó
   */
  async switchKeyIfLowQuota(type: string, excludeKeyId?: string): Promise<ApiKeyDoc> {
    const q = query(collection(db, 'api_keys'), where('type', '==', type));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error(`[API Key Manager] Không tìm thấy bất kỳ key nào cho loại: ${type}`);
    }

    let allKeys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiKeyDoc));

    // Loại bỏ key vừa bị lỗi 429 (nếu có)
    if (excludeKeyId) {
      allKeys = allKeys.filter(k => k.id !== excludeKeyId);
    }

    if (allKeys.length === 0) {
      throw new Error(`[API Key Manager] Tất cả các key đều đã bị block/exhausted.`);
    }

    // Sắp xếp key theo % quota còn lại giảm dần
    allKeys.sort((a, b) => this.getRemainingQuota(b) - this.getRemainingQuota(a));

    const bestKey = allKeys[0];
    const bestRemaining = this.getRemainingQuota(bestKey);

    // Xử lý lỗi: Khi tất cả các key đều dưới 20%
    if (bestRemaining < QUOTA_THRESHOLD) {
      console.warn(`[CRITICAL WARNING] Tất cả API keys loại '${type}' đều dưới 20% quota! Đang sử dụng key tốt nhất còn lại (${Math.round(bestRemaining * 100)}%). Vui lòng nạp thêm tiền hoặc thêm key mới.`);
    }

    // Cập nhật database: Set bestKey thành active, các key khác thành inactive
    const updatePromises = snapshot.docs.map(docSnapshot => {
      const isActive = docSnapshot.id === bestKey.id;
      if (docSnapshot.data().is_active !== isActive) {
        return updateDoc(doc(db, 'api_keys', docSnapshot.id), { is_active: isActive });
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    return bestKey;
  },

  /**
   * 4. Ghi nhận lượng token/page đã sử dụng
   */
  async markUsage(keyId: string, tokensUsed: number): Promise<void> {
    try {
      const keyRef = doc(db, 'api_keys', keyId);
      await updateDoc(keyRef, {
        used_quota: increment(tokensUsed),
        updated_at: Date.now()
      });
    } catch (error) {
      console.error(`[API Key Manager] Lỗi khi cập nhật usage cho key ${keyId}:`, error);
    }
  },

  /**
   * 5. Xử lý khẩn cấp khi gặp lỗi 429 (Rate Limit / Quota Exceeded)
   */
  async handle429Error(type: string, failedKeyId: string): Promise<ApiKeyDoc> {
    console.warn(`[API Key Manager] Key ${failedKeyId} bị lỗi 429. Đang force switch sang key khác...`);
    
    // Đánh dấu key bị lỗi là đã hết sạch quota (để không bao giờ được chọn lại cho đến khi reset)
    await updateDoc(doc(db, 'api_keys', failedKeyId), {
      used_quota: increment(99999999), // Force exhausted
      is_active: false
    });

    // Tìm key mới
    return await this.switchKeyIfLowQuota(type, failedKeyId);
  }
};
