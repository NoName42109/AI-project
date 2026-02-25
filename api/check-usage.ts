export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const llamaKey = process.env.LLAMA_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!llamaKey) {
    return new Response(JSON.stringify({ error: 'Missing LLAMA_API_KEY' }), { status: 500 });
  }

  const result: any = {
    llama: null,
    gemini: null,
    timestamp: Date.now()
  };

  // 1. Check Llama Cloud Usage
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Lưu ý: LlamaParse hiện tại có thể không public endpoint /usage. 
    // Đây là endpoint giả định/best-effort. Nếu trả về 404, sẽ catch ở dưới.
    const llamaRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/usage', {
      headers: { 'Authorization': `Bearer ${llamaKey}` },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (llamaRes.ok) {
      const data = await llamaRes.json();
      const total = data.total_pages_allowed || 1000;
      const used = data.total_pages_used || 0;
      const remainingPercent = Math.max(0, ((total - used) / total) * 100);
      
      result.llama = {
        status: 'success',
        total_limit: total,
        used: used,
        remaining_percent: remainingPercent,
        reset_time: data.reset_time || 'Đầu tháng sau',
        health: remainingPercent < 5 ? 'critical' : remainingPercent < 20 ? 'warning' : 'ok'
      };
    } else if (llamaRes.status === 401 || llamaRes.status === 403) {
      result.llama = { status: 'error', error: '401 Unauthorized: API Key không hợp lệ hoặc đã hết hạn.' };
    } else if (llamaRes.status === 429) {
      result.llama = { status: 'error', error: '429 Rate Limit Exceeded: Đã vượt quá giới hạn request.' };
    } else if (llamaRes.status === 404 || llamaRes.status === 501) {
      result.llama = { status: 'unsupported', error: 'API không hỗ trợ endpoint usage.' };
    } else {
      result.llama = { status: 'error', error: `Lỗi HTTP ${llamaRes.status}` };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      result.llama = { status: 'error', error: 'Timeout: Không thể kết nối đến Llama Cloud.' };
    } else {
      result.llama = { status: 'error', error: error.message };
    }
  }

  // 2. Check Gemini Usage
  if (geminiKey) {
    try {
      // Google Gemini API không hỗ trợ check quota qua REST API key thông thường (cần Google Cloud Monitoring).
      // Do đó, trả về trạng thái unsupported theo yêu cầu.
      result.gemini = { 
        status: 'unsupported', 
        error: 'API không hỗ trợ endpoint usage (Cần xem trên Google Cloud Console).' 
      };
    } catch (error: any) {
      result.gemini = { status: 'error', error: error.message };
    }
  } else {
    result.gemini = { status: 'error', error: 'Chưa cấu hình GEMINI_API_KEY' };
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
