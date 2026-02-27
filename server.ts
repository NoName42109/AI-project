import express from "express";
import multer from "multer";
import cors from "cors";
import { apiKeyManager } from "./src/services/apiKeyManager";

// Polyfill for Node.js environments where FormData/Blob/fetch might be missing or limited
// We use a more robust approach that avoids top-level await at the module root
async function ensurePolyfills() {
  if (typeof global.fetch === 'undefined') {
    console.log("[Polyfill] Loading fetch polyfill...");
    try {
      // @ts-ignore
      const nodeFetch = await import('node-fetch');
      global.fetch = nodeFetch.default as any;
      global.Headers = nodeFetch.Headers as any;
      global.Request = nodeFetch.Request as any;
      global.Response = nodeFetch.Response as any;
    } catch (e) {
      console.error("[Polyfill] Failed to load node-fetch", e);
    }
  }

  if (typeof global.FormData === 'undefined') {
    console.log("[Polyfill] Loading FormData polyfill...");
    try {
      // @ts-ignore
      const FormDataPolyfill = await import('form-data');
      global.FormData = FormDataPolyfill.default as any;
    } catch (e) {
      console.error("[Polyfill] Failed to load form-data", e);
    }
  }
}

// Call polyfills immediately but don't block module loading
ensurePolyfills().catch(console.error);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Helper cho Auto Rotation
async function withLlamaKeyRotation<T>(action: (apiKey: string) => Promise<{ result: T, headers?: Headers }>): Promise<T> {
  const activeKeyInfo = await apiKeyManager.getActiveKey();
  
  if (!activeKeyInfo) {
    throw new Error('Tất cả API keys đều đã hết Quota hoặc chưa được cấu hình.');
  }

  try {
    const { result, headers } = await action(activeKeyInfo.key);
    // If successful, update quota
    if (headers) {
      await apiKeyManager.updateQuotaFromResponse(activeKeyInfo.docId, headers, true);
    } else {
      // If we don't have headers but it succeeded, we just increment usage
      await apiKeyManager.updateQuotaFromResponse(activeKeyInfo.docId, new Headers(), true);
    }
    return result;
  } catch (error: any) {
    const status = error.status;
    if (status === 429 || status === 401 || status === 403 || status === 402) {
      console.warn(`[Auto Rotation] Key lỗi (${status}). Đánh dấu hết quota...`);
      await apiKeyManager.markKeyAsExhausted(activeKeyInfo.docId);
      // Try again recursively with the next available key
      return withLlamaKeyRotation(action);
    } else {
      throw error;
    }
  }
}

// API 1: Lấy danh sách API Keys
app.get(["/api/keys/list", "/keys/list"], async (req, res) => {
  try {
    const keys = apiKeyManager.loadKeysFromEnv();
    
    if (keys.length === 0) {
      console.warn('[API Keys] LLAMA_API_KEYS is empty in environment variables.');
      return res.json([]);
    }

    // Initialize missing keys in Firestore and get their status
    const results = await apiKeyManager.initializeMissingKeys();
    
    // Format results for the frontend component
    const formattedResults = results.map((record, index) => {
      // If a key has 0 usage, we ensure it shows 100% and "active"
      const isUnused = record.usageCount === 0;
      
      return {
        id: record.id || `env_key_${index + 1}`,
        service: 'llamacloud',
        maskedKey: record.maskedKey,
        quotaRemainingPercent: isUnused ? 100 : record.quotaRemainingPercent,
        status: isUnused ? 'active' : record.status,
        usageCount: record.usageCount,
        lastUsed: record.lastUsed,
        isNew: isUnused
      };
    });

    res.json(formattedResults);
  } catch (error: any) {
    console.error('[API Keys] Error processing keys:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// API 2: Math OCR
app.post(["/api/math-ocr", "/math-ocr"], async (req, res) => {
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
      let finalHeaders: Headers | undefined;
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
          finalHeaders = resultRes.headers;
          const resultData = await resultRes.json();
          
          const fullText = resultData.markdown || "";
          const jsonMatch = fullText.match(/```(?:json)?\n([\s\S]*?)\n```/) || fullText.match(/\{[\s\S]*\}/);
          const cleanJsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : fullText;
          
          try {
            parsedJson = JSON.parse(cleanJsonStr.trim());
            
            // Validate parsed JSON structure
            if (!parsedJson.full_latex_document && !parsedJson.math_regions) {
              throw new Error("Parsed JSON missing required fields");
            }
            break;
          } catch (e) {
            console.warn("[LlamaParse] Không trả về JSON hợp lệ. Đang dùng Regex Fallback...");
            
            // Fallback: Tự động trích xuất công thức toán từ Markdown
            const mathRegions: any[] = [];
            const inlineMathRegex = /(?<!\$)\$([^$\n]+)\$(?!\$)/g;
            const blockMathRegex = /\$\$([\s\S]+?)\$\$/g;
            
            let match;
            while ((match = inlineMathRegex.exec(fullText)) !== null) {
              if (match[1].trim()) {
                mathRegions.push({ latex: match[1].trim(), confidence: 0.85 });
              }
            }
            while ((match = blockMathRegex.exec(fullText)) !== null) {
              if (match[1].trim()) {
                mathRegions.push({ latex: match[1].trim(), confidence: 0.90 });
              }
            }
            
            parsedJson = {
              raw_text: fullText.replace(/\$\$[\s\S]+?\$\$/g, '').replace(/\$[^$]+\$/g, ''),
              math_regions: mathRegions,
              full_latex_document: fullText
            };
            break;
          }
        }
        
        if (statusData.status === 'ERROR') {
          throw new Error('500: Llama Cloud xử lý thất bại');
        }
      }

      if (!parsedJson) {
        throw new Error('Timeout: Llama Cloud xử lý quá lâu');
      }

      return { result: parsedJson, headers: finalHeaders };
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

    res.json(finalOutput);

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
});

// API 3: Math OCR Stream (New Architecture)
app.post(["/api/math-ocr-stream", "/math-ocr-stream"], upload.single('file'), async (req, res) => {
  console.log("[Upload Stream] Request started");
  let headersSent = false;

  const sendEvent = (step: string, percent: number, data?: any) => {
    try {
      if (!headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.status(200);
        headersSent = true;
      }
      res.write(`data: ${JSON.stringify({ step, percent, data })}\n\n`);
    } catch (e) {
      console.error("[SSE] Write failed", e);
    }
  };

  try {
    // Ensure polyfills are ready before proceeding
    await ensurePolyfills();
    
    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    // Support both JSON (Base64) and Multipart (File)
    if (req.file) {
      console.log(`[Upload Stream] Received via Multipart: ${req.file.originalname} (${req.file.size} bytes)`);
      buffer = req.file.buffer;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;
    } else if (req.body && req.body.fileData) {
      const { fileName: fn, mimeType: mt, fileData } = req.body;
      console.log(`[Upload Stream] Received via JSON: ${fn}`);
      const base64Part = fileData.split(',')[1] || fileData;
      buffer = Buffer.from(base64Part, 'base64');
      fileName = fn || 'document.pdf';
      mimeType = mt || 'application/pdf';
    } else {
      console.error("[Upload Stream] No file data found in request");
      return res.status(400).json({ 
        error: 'No file provided',
        message: 'Vui lòng cung cấp file qua Multipart (field: file) hoặc JSON base64'
      });
    }

    const llamaKeys = process.env.LLAMA_API_KEYS || process.env.LLAMA_API_KEY;
    if (!llamaKeys) {
      console.error("[Upload Stream] LLAMA_API_KEYS missing");
      throw new Error("Chưa cấu hình LLAMA_API_KEYS trong biến môi trường. Vui lòng kiểm tra Vercel Dashboard.");
    }

    sendEvent('uploading', 10);
    sendEvent('uploading', 20);

    const resultJson = await withLlamaKeyRotation(async (apiKey) => {
      console.log("[Upload Stream] Sending to LlamaCloud API...");
      
      // Use a more robust way to build the form data for fetch
      const uploadData = new FormData();
      
      // Check if we are using the polyfilled FormData (form-data package)
      const isPolyfilledFormData = (uploadData as any).getHeaders !== undefined;
      
      if (isPolyfilledFormData) {
        // form-data package usage
        (uploadData as any).append('file', buffer, { filename: fileName, contentType: mimeType });
        (uploadData as any).append('premium_mode', 'true');
      } else {
        // Native FormData usage (Node 18+)
        const blob = new Blob([buffer], { type: mimeType });
        uploadData.append('file', blob, fileName);
        uploadData.append('premium_mode', 'true');
      }
      
      const instruction = `
        Bạn là chuyên gia Toán học và OCR. Nhiệm vụ của bạn là đọc đề thi và trích xuất dữ liệu.
        CHÚ Ý ĐẶC BIỆT:
        - Phân số lồng nhau: Phải dùng \\frac{a}{b}.
        - Hệ phương trình: BẮT BUỘC dùng \\begin{cases} ... \\end{cases}.
        - Ký hiệu đặc biệt: Delta là \\Delta, Mọi là \\forall, Tồn tại là \\exists.
        - Tham số m: Phân biệt rõ chữ 'm' (tham số) và 'm' (mét). Trong ngữ cảnh phương trình, nó là tham số $m$.
        - Nghiệm: x1, x2 phải viết là x_1, x_2.
        
        PHÂN LOẠI DẠNG TOÁN:
        Xác định xem đề thi này có chứa câu hỏi về "Hệ thức Vi-ét" lớp 9 hay không.
        Các dạng toán Vi-ét thường gặp:
        - tim_m: Tìm m để phương trình có 2 nghiệm thỏa mãn điều kiện.
        - tinh_tong_tich: Tính giá trị biểu thức đối xứng giữa các nghiệm.
        - lap_pt: Lập phương trình bậc 2 khi biết 2 nghiệm.
        - other: Các dạng khác.

        TRẢ VỀ DUY NHẤT JSON THEO FORMAT SAU (Không kèm markdown code block):
        {
           "isViet": true/false,
           "topic": "he_thuc_viet" hoặc "other",
           "questionCount": số lượng câu hỏi toán,
           "questions": [
              {
                 "type": "tim_m" | "tinh_tong_tich" | "lap_pt" | "other",
                 "latex": "nội dung câu hỏi bằng LaTeX chuẩn"
              }
           ]
        }
      `;
      uploadData.append('parsing_instruction', instruction);

      const fetchOptions: any = {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`
        },
        body: uploadData
      };

      // If using form-data package, we must add its headers
      if (isPolyfilledFormData) {
        Object.assign(fetchOptions.headers, (uploadData as any).getHeaders());
      }

      sendEvent('ocr', 25);
      const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', fetchOptions);

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error(`[LlamaCloud] Upload failed: ${uploadRes.status} ${errorText}`);
        throw new Error(`LlamaCloud Upload failed (${uploadRes.status}): ${errorText.substring(0, 100)}`);
      }

      const { id: jobId } = await uploadRes.json();
      console.log(`[Upload Stream] Job created: ${jobId}`);
      sendEvent('ocr', 30);

      let parsedJson: any = null;
      let finalHeaders: Headers | undefined;
      const maxAttempts = 15;
      
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 3000));
        
        // Progress from 30 to 50 during polling
        const progress = Math.min(50, 30 + (i * 2));
        sendEvent('ocr', progress);

        const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const statusData = await statusRes.json();

        if (statusData.status === 'SUCCESS') {
          sendEvent('normalize', 60);
          const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          finalHeaders = resultRes.headers;
          const resultData = await resultRes.json();
          
          sendEvent('classifying', 75);
          const fullText = resultData.markdown || "";
          const jsonMatch = fullText.match(/```(?:json)?\n([\s\S]*?)\n```/) || fullText.match(/\{[\s\S]*\}/);
          const cleanJsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : fullText;
          
          try {
            parsedJson = JSON.parse(cleanJsonStr.trim());
            if (parsedJson.isViet === undefined || !parsedJson.questions) {
              throw new Error("Invalid JSON structure");
            }
            break;
          } catch (e) {
            console.warn("[LlamaParse] JSON parse failed, using fallback");
            // Fallback logic
            const isViet = fullText.toLowerCase().includes('vi-ét') || fullText.toLowerCase().includes('vi-et') || fullText.includes('x_1') || fullText.includes('x_2');
            parsedJson = {
              isViet: isViet,
              topic: isViet ? "he_thuc_viet" : "other",
              questionCount: 1,
              questions: [
                { type: "other", latex: fullText }
              ]
            };
            break;
          }
        }
        
        if (statusData.status === 'ERROR') {
          throw new Error('Llama Cloud xử lý thất bại');
        }
      }

      if (!parsedJson) {
        throw new Error('Timeout: Llama Cloud xử lý quá lâu');
      }

      return { result: parsedJson, headers: finalHeaders };
    });

    sendEvent('saving', 90);
    sendEvent('done', 100, resultJson);
    res.end();

  } catch (error: any) {
    console.error('[Upload Stream Error]', error);
    sendEvent('error', 0, { message: error.message });
    res.end();
  }
});

// Start server for local development
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server if not running on Vercel
if (!process.env.VERCEL) {
  startServer();
}

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[Global Error]", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error",
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
