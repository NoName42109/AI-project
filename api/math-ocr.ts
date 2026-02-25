import { withLlamaKeyRotation } from './utils/envKeyManager';

export const config = {
  runtime: 'edge',
};

const LLAMA_API_URL = 'https://api.cloud.llamaindex.ai/api/parsing';

// Hàm kiểm tra cân bằng ngoặc LaTeX
function validateLatexSyntax(latex: string): boolean {
  if (!latex) return false;
  let balance = 0;
  for (let i = 0; i < latex.length; i++) {
    if (latex[i] === '{') balance++;
    if (latex[i] === '}') {
      balance--;
      if (balance < 0) return false; // Thừa ngoặc đóng
    }
  }
  return balance === 0; // Nếu > 0 là thiếu ngoặc đóng
}

// Hàm chuẩn hóa đặc thù Vi-ét
function normalizeVietaLatex(latex: string): string {
  if (!latex) return "";
  return latex
    // Chuẩn hóa x1, x2 thành x_1, x_2 (chỉ khi đứng độc lập hoặc trong công thức)
    .replace(/\bx1\b/g, 'x_1')
    .replace(/\bx2\b/g, 'x_2')
    // Chuẩn hóa tổng tích liền nhau
    .replace(/x_1\s*\+\s*x_2/g, 'x_1 + x_2')
    .replace(/x_1x_2/g, 'x_1 x_2')
    .replace(/x_1\s*\.\s*x_2/g, 'x_1 x_2')
    // Chuẩn hóa phương trình bậc 2 (thêm khoảng trắng cho đẹp)
    .replace(/([a-zA-Z0-9])x\^2/g, '$1x^2')
    .replace(/x\^2([+-])/g, 'x^2 $1');
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    // --- SỬ DỤNG AUTO ROTATION WRAPPER ---
    const resultJson = await withLlamaKeyRotation(async (apiKey) => {
      // --- PASS 1: GỌI LLAMA CLOUD (VISION ENCODER) ---
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('premium_mode', 'true'); // Kích hoạt model Vision chất lượng cao
      
      const instruction = `
        Bạn là Mathpix OCR Engine chuyên nghiệp. Nhiệm vụ của bạn là nhận diện văn bản và công thức toán học từ ảnh/tài liệu.
        CHÚ Ý ĐẶC BIỆT (Hệ thức Vi-ét lớp 9):
        - Phân số lồng nhau: Phải dùng \\frac{a}{b}.
        - Hệ phương trình: BẮT BUỘC dùng \\begin{cases} ... \\end{cases}.
        - Ký hiệu đặc biệt: Delta là \\Delta, Mọi là \\forall, Tồn tại là \\exists.
        - Tham số m: Phân biệt rõ chữ 'm' (tham số) và 'm' (mét). Trong ngữ cảnh phương trình, nó là tham số $m$.
        - Nghiệm: x1, x2 phải viết là x_1, x_2.
        
        TRẢ VỀ DUY NHẤT JSON THEO FORMAT SAU (Không kèm markdown code block, chỉ trả về JSON hợp lệ):
        {
          "raw_text": "Toàn bộ text thô không chứa mã LaTeX",
          "math_regions": [
            {
              "latex": "công thức 1",
              "confidence": 0.98
            }
          ],
          "full_latex_document": "Toàn bộ tài liệu, trong đó công thức toán được bọc trong dấu $...$ hoặc $$...$$"
        }
      `;
      
      uploadData.append('parsing_instruction', instruction);

      const uploadRes = await fetch(`${LLAMA_API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: uploadData
      });

      if (!uploadRes.ok) {
        const error: any = new Error(`Upload failed: ${uploadRes.statusText}`);
        error.status = uploadRes.status; // Gắn status để wrapper biết đường rotate
        throw error;
      }

      const { id: jobId } = await uploadRes.json();

      // --- POLLING LẤY KẾT QUẢ ---
      let parsedJson: any = null;
      const maxAttempts = 15; // Timeout khoảng 60s
      
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 4000));
        
        const statusRes = await fetch(`${LLAMA_API_URL}/job/${jobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const statusData = await statusRes.json();

        if (statusData.status === 'SUCCESS') {
          const resultRes = await fetch(`${LLAMA_API_URL}/job/${jobId}/result/markdown`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          const resultData = await resultRes.json();
          
          const fullText = resultData.markdown || "";
          const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/) || fullText.match(/\{[\s\S]*\}/);
          const cleanJsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : fullText;
          
          try {
            parsedJson = JSON.parse(cleanJsonStr.trim());
            break;
          } catch (e) {
            console.error("Failed to parse JSON from LlamaParse:", cleanJsonStr);
            throw new Error("Llama Cloud trả về dữ liệu không đúng định dạng JSON");
          }
        }
        
        if (statusData.status === 'ERROR') {
          throw new Error('500: Llama Cloud xử lý thất bại');
        }
      }

      if (!parsedJson) {
        throw new Error('Timeout: Llama Cloud xử lý quá lâu');
      }

      return parsedJson;
    });

    // --- POST-PROCESSING & VALIDATION LAYER ---
    let syntaxValid = true;
    let needsReview = false;

    // 1. Chuẩn hóa Vi-ét
    resultJson.full_latex_document = normalizeVietaLatex(resultJson.full_latex_document);
    if (resultJson.math_regions && Array.isArray(resultJson.math_regions)) {
      resultJson.math_regions = resultJson.math_regions.map((region: any) => ({
        ...region,
        latex: normalizeVietaLatex(region.latex)
      }));
    }

    // 2. Validate Syntax (Cân bằng ngoặc)
    if (!validateLatexSyntax(resultJson.full_latex_document)) {
      syntaxValid = false;
      needsReview = true;
      console.warn("[MER Validation] Lỗi cú pháp LaTeX phát hiện (mất cân bằng ngoặc).");
    }

    // 3. So sánh Text Length
    const rawLen = (resultJson.raw_text || "").length;
    const latexLen = (resultJson.full_latex_document || "").length;
    if (rawLen > 0 && latexLen < rawLen * 0.5) {
      needsReview = true;
      console.warn(`[MER Validation] Cảnh báo mất mát dữ liệu: Raw(${rawLen}) vs LaTeX(${latexLen})`);
    }

    // 4. Kiểm tra Confidence
    if (resultJson.math_regions && Array.isArray(resultJson.math_regions)) {
      const lowConfidenceRegions = resultJson.math_regions.filter((r: any) => r.confidence && r.confidence < 0.9);
      if (lowConfidenceRegions.length > 0) {
        needsReview = true;
        console.warn(`[MER Confidence] Phát hiện ${lowConfidenceRegions.length} vùng có confidence < 0.9`);
      }
    }

    // --- FINAL OUTPUT ---
    const finalOutput = {
      raw_text: resultJson.raw_text || "",
      math_regions: resultJson.math_regions || [],
      full_latex_document: resultJson.full_latex_document || "",
      syntax_valid: syntaxValid,
      needs_review: needsReview
    };

    return new Response(JSON.stringify(finalOutput), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[MER Pipeline Error]', error);
    const status = error.message.includes('401') ? 401 
                 : error.message.includes('413') ? 413 
                 : error.message.includes('Timeout') ? 504 : 500;
                 
    return new Response(JSON.stringify({ 
      error: 'Lỗi xử lý tài liệu OCR', 
      details: error.message,
      // Fallback data
      raw_text: "Lỗi trích xuất",
      math_regions: [],
      full_latex_document: "Lỗi trích xuất",
      syntax_valid: false,
      needs_review: true
    }), { status, headers: { 'Content-Type': 'application/json' } });
  }
}
