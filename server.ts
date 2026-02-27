import express from "express";
import multer from "multer";
import cors from "cors";
import { apiKeyManager } from "./src/services/apiKeyManager.js";
import { GoogleGenAI } from "@google/genai";

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

// Helper cho Auto Rotation Gemini
async function withGeminiKeyRotation<T>(action: (ai: GoogleGenAI, docId: string) => Promise<T>): Promise<T> {
  const activeKeyInfo = await apiKeyManager.getActiveKey();
  
  if (!activeKeyInfo) {
    throw new Error('Tất cả API keys Gemini đều đã hết Quota hoặc chưa được cấu hình.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: activeKeyInfo.key });
    const result = await action(ai, activeKeyInfo.docId);
    // If successful, track usage
    await apiKeyManager.trackUsage(activeKeyInfo.docId, true);
    return result;
  } catch (error: any) {
    const errorMsg = error.message || "";
    // Gemini quota errors often contain "429" or "quota"
    if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('403')) {
      console.warn(`[Auto Rotation] Key Gemini lỗi hoặc hết quota. Đang chuyển key...`);
      await apiKeyManager.markKeyAsExhausted(activeKeyInfo.docId);
      return withGeminiKeyRotation(action);
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
      console.warn('[API Keys] GEMINI_API_KEYS is empty in environment variables.');
      return res.json([]);
    }

    // Initialize missing keys in Firestore and get their status
    const results = await apiKeyManager.initializeMissingKeys();
    
    // Format results for the frontend component
    const formattedResults = results.map((record, index) => {
      return {
        id: record.id || `env_key_${index + 1}`,
        service: 'gemini',
        maskedKey: record.maskedKey,
        quotaRemainingPercent: record.quotaRemainingPercent,
        status: record.status,
        usageCount: record.usageCount,
        lastUsed: record.lastUsed,
        isNew: record.isNew
      };
    });

    res.json(formattedResults);
  } catch (error: any) {
    console.error('[API Keys] Error processing keys:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// API 1.1: Cleanup old keys
app.post(["/api/keys/cleanup", "/keys/cleanup"], async (req, res) => {
  try {
    await apiKeyManager.cleanupOldData();
    res.json({ message: "Cleanup successful" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API 2: Math OCR (Legacy - Redirect to Stream or implement if needed)
// For simplicity, we'll focus on the Stream version which is more robust
app.post(["/api/math-ocr", "/math-ocr"], async (req, res) => {
  res.status(405).json({ error: "Vui lòng sử dụng /api/math-ocr-stream để có trải nghiệm tốt nhất." });
});

// API 3: Math OCR Stream (Gemini Architecture)
app.post(["/api/math-ocr-stream", "/math-ocr-stream"], upload.single('file'), async (req, res) => {
  console.log("[Gemini Stream] Request started");
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
    await ensurePolyfills();
    
    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    if (req.file) {
      buffer = req.file.buffer;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;
    } else if (req.body && req.body.fileData) {
      const { fileName: fn, mimeType: mt, fileData } = req.body;
      const base64Part = fileData.split(',')[1] || fileData;
      buffer = Buffer.from(base64Part, 'base64');
      fileName = fn || 'document.pdf';
      mimeType = mt || 'application/pdf';
    } else {
      return res.status(400).json({ error: 'No file provided' });
    }

    const geminiKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
    if (!geminiKeys) {
      throw new Error("Chưa cấu hình GEMINI_API_KEYS trong biến môi trường.");
    }

    sendEvent('uploading', 20);

    const result = await withGeminiKeyRotation(async (ai) => {
      console.log("[Gemini Stream] Processing with Gemini...");
      sendEvent('ocr', 40);

      const model = "gemini-1.5-pro"; // Use Pro for better OCR and PDF handling
      
      const prompt = `
        Bạn là chuyên gia Toán học và OCR. Nhiệm vụ của bạn là đọc đề thi từ file PDF đính kèm và trích xuất dữ liệu.
        
        YÊU CẦU:
        1. OCR toàn bộ nội dung đề thi.
        2. Chuẩn hóa tất cả công thức toán học sang LaTeX chuẩn.
           - Phân số: \\frac{a}{b}
           - Hệ phương trình: \\begin{cases} ... \\end{cases}
           - Ký hiệu: \\Delta, \\forall, \\exists, x_1, x_2
        3. Tách từng câu hỏi riêng biệt.
        4. Phân loại dạng toán cho từng câu.
        5. Xác định xem đề thi này có phải chuyên đề "Hệ thức Vi-ét" lớp 9 hay không.
        
        DẠNG TOÁN VI-ÉT:
        - tim_m: Tìm m để phương trình có nghiệm thỏa mãn điều kiện.
        - tinh_tong_tich: Tính giá trị biểu thức đối xứng.
        - lap_pt: Lập phương trình bậc 2.
        - other: Các dạng khác.

        TRẢ VỀ DUY NHẤT JSON THEO FORMAT SAU:
        {
           "isViet": true/false,
           "topic": "he_thuc_viet" hoặc "other",
           "totalQuestions": number,
           "questions": [
              {
                 "type": "tim_m" | "tinh_tong_tich" | "lap_pt" | "other",
                 "difficulty": "easy" | "medium" | "hard",
                 "latex": "nội dung câu hỏi bằng LaTeX chuẩn"
              }
           ]
        }
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: buffer.toString('base64')
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) throw new Error("Gemini không trả về kết quả.");

      const parsed = JSON.parse(text);
      
      if (!parsed.isViet) {
        // As requested: Nếu không phải Vi-ét, trả cảnh báo
        return { 
          warning: "Tài liệu này không thuộc chuyên đề Hệ thức Vi-ét lớp 9.",
          isViet: false,
          data: parsed
        };
      }

      return { isViet: true, data: parsed };
    });

    if (!result.isViet) {
      sendEvent('error', 0, { message: result.warning });
    } else {
      sendEvent('saving', 90);
      sendEvent('done', 100, result.data);
    }
    res.end();

  } catch (error: any) {
    console.error('[Gemini Stream Error]', error);
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
    // Cleanup old data on start
    apiKeyManager.cleanupOldData().catch(err => console.error("Startup cleanup failed:", err));
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
