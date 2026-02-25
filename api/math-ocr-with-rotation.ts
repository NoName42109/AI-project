import { apiKeyManager } from './utils/apiKeyManager';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // --- 1. LẤY API KEY TỪ MANAGER (KHÔNG DÙNG process.env) ---
    const activeKeyRecord = await apiKeyManager.getActiveKey('llamacloud');
    const apiKey = activeKeyRecord.key;

    // --- 2. GỌI LLAMA CLOUD (VISION ENCODER) ---
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('premium_mode', 'true');
    uploadData.append('parsing_instruction', 'Trích xuất đề thi Vi-ét lớp 9...');

    const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: uploadData
    });

    // --- 3. XỬ LÝ LỖI VÀ ROTATE KEY NẾU CẦN ---
    if (!uploadRes.ok) {
      if (uploadRes.status === 401 || uploadRes.status === 429) {
        // Key chết hoặc hết hạn -> Disable ngay lập tức
        await apiKeyManager.disableKey(activeKeyRecord.id, `Lỗi HTTP ${uploadRes.status}`);
        throw new Error(`API Key ${activeKeyRecord.maskedKey} bị từ chối. Đã tự động vô hiệu hóa.`);
      }
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    }

    const { id: jobId } = await uploadRes.json();

    // ... (Polling lấy kết quả như cũ) ...
    // Giả lập lấy kết quả thành công
    const resultJson = { raw_text: "...", math_regions: [], full_latex_document: "..." };

    // --- 4. CẬP NHẬT QUOTA SAU KHI THÀNH CÔNG ---
    // (Giả sử LlamaCloud trả về usage trong header hoặc bạn tự ước tính)
    // Ví dụ: Mỗi lần gọi trừ 1 page. Bạn cần fetch /usage của LlamaCloud để lấy số chính xác.
    const usageRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/usage', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (usageRes.ok) {
      const usageData = await usageRes.json();
      const total = usageData.total_pages_allowed || 1000;
      const used = usageData.total_pages_used || 0;
      const remainingPercent = Math.max(0, ((total - used) / total) * 100);
      
      // Update Quota. Nếu < 20%, hàm này sẽ tự động đổi status thành 'low_quota'
      await apiKeyManager.updateQuotaAndRotateIfNeeded(activeKeyRecord.id, remainingPercent);
    }

    return new Response(JSON.stringify(resultJson), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[MER Pipeline Error]', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
