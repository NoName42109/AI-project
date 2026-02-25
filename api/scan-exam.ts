export const config = {
  runtime: 'edge',
};

const LLAMA_API_URL = 'https://api.cloud.llamaindex.ai/api/parsing';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.LLAMA_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing LLAMA_API_KEY in environment variables' }), { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    // Lần 1: Quét và ép kiểu JSON + LaTeX
    let resultJson = await processWithLlama(file, apiKey, false);

    // Kiểm tra không bỏ sót (Validation)
    const isMissingContent = validateExtraction(resultJson);
    
    if (isMissingContent) {
      console.warn("[Scanner] Phát hiện thiếu dữ liệu (điều kiện/tham số m). Đang re-parse...");
      // Lần 2: Re-parse với strict mode
      resultJson = await processWithLlama(file, apiKey, true);
    }

    return new Response(JSON.stringify(resultJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Scan Error]', error);
    const status = error.message.includes('401') ? 401 
                 : error.message.includes('413') ? 413 
                 : error.message.includes('Timeout') ? 504 : 500;
                 
    return new Response(JSON.stringify({ 
      error: 'Lỗi xử lý tài liệu', 
      details: error.message 
    }), { status, headers: { 'Content-Type': 'application/json' } });
  }
}

async function processWithLlama(file: File, apiKey: string, isStrictRetry: boolean) {
  const uploadData = new FormData();
  uploadData.append('file', file);
  
  const instruction = `
    Bạn là hệ thống trích xuất đề thi Toán lớp 9 (Hệ thức Vi-ét).
    YÊU CẦU BẮT BUỘC:
    1. Chuyển toàn bộ công thức toán sang LaTeX chuẩn (\\frac{}, \\sqrt{}, x^{2}, \\begin{cases}...).
    2. KHÔNG bỏ sót bất kỳ điều kiện nào (VD: m > 0, x1 < x2), tham số m, hay chú thích trong ngoặc.
    3. Phân tích cấu trúc: Tách câu hỏi chính và các ý nhỏ (a, b, c).
    4. Xác định xem các ý nhỏ có phụ thuộc điều kiện chung của câu chính không (detectedDependencies).
    ${isStrictRetry ? 'CẢNH BÁO: Lần quét trước đã bị sót tham số "m" hoặc điều kiện. Hãy rà soát từng chữ một!' : ''}
    
    TRẢ VỀ DUY NHẤT JSON THEO FORMAT SAU (Không kèm markdown code block, chỉ trả về JSON hợp lệ):
    {
      "raw_text": "text thô nguyên bản",
      "latex_full": "toàn bộ nội dung đã chuyển LaTeX",
      "structured_questions": [
        {
          "id": "q1",
          "content_latex": "Nội dung câu chính + điều kiện chung",
          "subQuestions": [
            { "label": "a", "content_latex": "Nội dung ý a" }
          ],
          "detectedDependencies": true
        }
      ]
    }
  `;
  
  uploadData.append('parsing_instruction', instruction);

  // 1. Upload file
  const uploadRes = await fetch(`${LLAMA_API_URL}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: uploadData
  });

  if (!uploadRes.ok) {
    if (uploadRes.status === 401) throw new Error('401: Llama API Key không hợp lệ');
    if (uploadRes.status === 413) throw new Error('413: File quá lớn');
    throw new Error(`Upload failed: ${uploadRes.statusText}`);
  }

  const { id: jobId } = await uploadRes.json();

  // 2. Polling lấy kết quả (Timeout 60s)
  const maxAttempts = 12;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    
    const statusRes = await fetch(`${LLAMA_API_URL}/job/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const statusData = await statusRes.json();

    if (statusData.status === 'SUCCESS') {
      const resultRes = await fetch(`${LLAMA_API_URL}/job/${jobId}/result/markdown`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const resultData = await resultRes.json();
      
      // LlamaParse trả về markdown, ta trích xuất JSON từ markdown
      const fullText = resultData.markdown || "";
      
      // Tìm khối JSON trong markdown
      const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/) || fullText.match(/\{[\s\S]*\}/);
      const cleanJsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : fullText;
      
      try {
        return JSON.parse(cleanJsonStr.trim());
      } catch (e) {
        console.error("Failed to parse JSON from LlamaParse:", cleanJsonStr);
        throw new Error("Llama Cloud trả về dữ liệu không đúng định dạng JSON");
      }
    }
    
    if (statusData.status === 'ERROR') {
      throw new Error('500: Llama Cloud xử lý thất bại');
    }
  }

  throw new Error('Timeout: Llama Cloud xử lý quá lâu');
}

function validateExtraction(json: any): boolean {
  if (!json || !json.raw_text || !json.latex_full) return true;
  
  const raw = json.raw_text.toLowerCase();
  const latex = json.latex_full.toLowerCase();

  // Kiểm tra mất tham số m
  if (raw.includes('m') && !latex.includes('m')) return true;
  
  // Kiểm tra độ dài sụt giảm bất thường (mất > 30% nội dung)
  if (latex.length < raw.length * 0.7) return true;

  // Kiểm tra mất điều kiện (>, <, =, \neq)
  const hasConditionRaw = /[><=≠]/.test(raw);
  const hasConditionLatex = /[><=]|\\neq|\\ge|\\le/.test(latex);
  if (hasConditionRaw && !hasConditionLatex) return true;

  return false;
}
