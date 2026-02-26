// Helper cho Auto Rotation
let currentLlamaIndex = 0;
async function withLlamaKeyRotation<T>(action: (apiKey: string) => Promise<T>): Promise<T> {
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
      return await action(key);
    } catch (error: any) {
      const status = error.status;
      if (status === 429 || status === 401 || status === 403) {
        console.warn(`[Auto Rotation] Key index ${currentLlamaIndex} lỗi (${status}). Chuyển sang key tiếp theo...`);
        currentLlamaIndex = (currentLlamaIndex + 1) % keys.length;
        attempts++;
        lastError = error;
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Tất cả ${keys.length} API keys đều đã hết Quota hoặc bị từ chối.`);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { fileName, mimeType, fileData } = req.body;
    
    if (!fileData) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Extract base64 part
    const base64Part = fileData.split(',')[1];
    if (!base64Part) {
      return res.status(400).json({ error: 'Invalid base64 data' });
    }

    const buffer = Buffer.from(base64Part, 'base64');

    const resultJson = await withLlamaKeyRotation(async (apiKey) => {
      const uploadData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      uploadData.append('file', blob, fileName);
      uploadData.append('premium_mode', 'true');
      
      const instruction = `
        Bạn là Mathpix OCR Engine chuyên nghiệp. Nhiệm vụ của bạn là nhận diện văn bản và công thức toán học từ ảnh/tài liệu.
        CHÚ Ý ĐẶC BIỆT (Hệ thức Vi-ét lớp 9):
        - Phân số lồng nhau: Phải dùng \\frac{a}{b}.
        - Hệ phương trình: BẮT BUỘC dùng \\begin{cases} ... \\end{cases}.
        - Ký hiệu đặc biệt: Delta là \\Delta, Mọi là \\forall, Tồn tại là \\exists.
        - Tham số m: Phân biệt rõ chữ 'm' (tham số) và 'm' (mét). Trong ngữ cảnh phương trình, nó là tham số $m$.
        - Nghiệm: x1, x2 phải viết là x_1, x_2.
        
        TRẢ VỀ DUY NHẤT JSON THEO FORMAT SAU:
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

      const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: uploadData
      });

      if (!uploadRes.ok) {
        const error: any = new Error(`Upload failed: ${uploadRes.statusText}`);
        error.status = uploadRes.status;
        throw error;
      }

      const { id: jobId } = await uploadRes.json();

      let parsedJson: any = null;
      const maxAttempts = 15;
      
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 4000));
        
        const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const statusData = await statusRes.json();

        if (statusData.status === 'SUCCESS') {
          const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
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

    // Post-processing
    let syntaxValid = true;
    let needsReview = false;

    const normalizeVietaLatex = (latex: string): string => {
      if (!latex) return "";
      return latex
        .replace(/\bx1\b/g, 'x_1')
        .replace(/\bx2\b/g, 'x_2')
        .replace(/x_1\s*\+\s*x_2/g, 'x_1 + x_2')
        .replace(/x_1x_2/g, 'x_1 x_2')
        .replace(/x_1\s*\.\s*x_2/g, 'x_1 x_2')
        .replace(/([a-zA-Z0-9])x\^2/g, '$1x^2')
        .replace(/x\^2([+-])/g, 'x^2 $1');
    };

    const validateLatexSyntax = (latex: string): boolean => {
      if (!latex) return false;
      let balance = 0;
      for (let i = 0; i < latex.length; i++) {
        if (latex[i] === '{') balance++;
        if (latex[i] === '}') {
          balance--;
          if (balance < 0) return false;
        }
      }
      return balance === 0;
    };

    resultJson.full_latex_document = normalizeVietaLatex(resultJson.full_latex_document);
    if (resultJson.math_regions && Array.isArray(resultJson.math_regions)) {
      resultJson.math_regions = resultJson.math_regions.map((region: any) => ({
        ...region,
        latex: normalizeVietaLatex(region.latex)
      }));
    }

    if (!validateLatexSyntax(resultJson.full_latex_document)) {
      syntaxValid = false;
      needsReview = true;
    }

    const rawLen = (resultJson.raw_text || "").length;
    const latexLen = (resultJson.full_latex_document || "").length;
    if (rawLen > 0 && latexLen < rawLen * 0.5) {
      needsReview = true;
    }

    const finalOutput = {
      raw_text: resultJson.raw_text || "",
      math_regions: resultJson.math_regions || [],
      full_latex_document: resultJson.full_latex_document || "",
      syntax_valid: syntaxValid,
      needs_review: needsReview
    };

    res.status(200).json(finalOutput);

  } catch (error: any) {
    console.error('[MER Pipeline Error]', error);
    const status = error.message.includes('401') ? 401 
                 : error.message.includes('413') ? 413 
                 : error.message.includes('Timeout') ? 504 : 500;
                 
    res.status(status).json({ 
      error: 'Lỗi xử lý tài liệu OCR', 
      details: error.message,
      raw_text: "Lỗi trích xuất",
      math_regions: [],
      full_latex_document: "Lỗi trích xuất",
      syntax_valid: false,
      needs_review: true
    });
  }
}
