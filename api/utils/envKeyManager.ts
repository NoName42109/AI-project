let currentLlamaIndex = 0;

/**
 * Hàm bọc (Wrapper) tự động thử các API Key.
 * Đọc danh sách key từ biến môi trường LLAMA_API_KEYS (cách nhau bằng dấu phẩy).
 * Nếu key hiện tại bị lỗi 429 (Hết quota) hoặc 401 (Unauthorized), tự động chuyển sang key tiếp theo.
 */
export async function withLlamaKeyRotation<T>(
  action: (apiKey: string) => Promise<T>
): Promise<T> {
  // Đọc danh sách key từ ENV, hỗ trợ cả biến cũ LLAMA_API_KEY và biến mới LLAMA_API_KEYS
  const keysStr = process.env.LLAMA_API_KEYS || process.env.LLAMA_API_KEY || '';
  const keys = keysStr.split(',').map(k => k.trim()).filter(k => k.length > 0);

  if (keys.length === 0) {
    throw new Error('Chưa cấu hình LLAMA_API_KEYS trong Vercel Environment Variables.');
  }

  let attempts = 0;
  let lastError: any;

  while (attempts < keys.length) {
    const key = keys[currentLlamaIndex];
    try {
      // Thực thi hành động quét đề với key hiện tại
      return await action(key);
    } catch (error: any) {
      const status = error.status;
      
      // 429: Hết Quota, 401/403: Key bị vô hiệu hóa
      if (status === 429 || status === 401 || status === 403) {
        console.warn(`[Auto Rotation] Key index ${currentLlamaIndex} lỗi (${status}). Chuyển sang key tiếp theo...`);
        
        // Chuyển sang index tiếp theo (quay vòng lại 0 nếu hết danh sách)
        currentLlamaIndex = (currentLlamaIndex + 1) % keys.length;
        attempts++;
        lastError = error;
      } else {
        // Nếu là lỗi khác (500 Server Error, Timeout, v.v.) thì throw luôn, không rotate
        throw error;
      }
    }
  }

  throw new Error(`Tất cả ${keys.length} API keys đều đã hết Quota hoặc bị từ chối.`);
}
