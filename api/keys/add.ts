import { db } from '../../src/services/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { service, key, status = 'standby' } = body;

    if (!service || !key) {
      return new Response(JSON.stringify({ error: 'Thiếu thông tin service hoặc API key' }), { status: 400 });
    }

    // Tạo masked key (chỉ lấy 4 ký tự cuối)
    const maskedKey = `****${key.slice(-4)}`;

    const newKeyData = {
      service,
      key, // Lưu key thật ở backend
      maskedKey,
      quotaRemainingPercent: 100,
      status, // Mặc định là standby để an toàn, admin có thể set active
      usageCount: 0,
      lastUsed: 0,
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(db, 'api_keys'), newKeyData);

    return new Response(JSON.stringify({ 
      success: true, 
      id: docRef.id,
      message: 'Đã thêm API Key thành công' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[Add API Key Error]', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
