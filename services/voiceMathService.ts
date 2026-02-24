import { GoogleGenAI, Type } from "@google/genai";
import { VoiceMathResult } from "../types";

export const voiceMathService = {
  /**
   * Analyze audio blob directly with Gemini Native Audio model
   */
  analyzeAudioMath: async (audioBlob: Blob): Promise<VoiceMathResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.5-flash-native-audio-preview-12-2025";

    // Convert Blob to Base64
    const base64Audio = await blobToBase64(audioBlob);
    const mimeType = audioBlob.type || "audio/wav";

    const prompt = `
    ROLE: Bạn là trợ lý toán học Vi-ét lớp 9 (Vieta's Formulas Tutor).
    TASK: Nghe giọng nói học sinh, chuyển thành văn bản, trích xuất biểu thức toán học và tự động tính toán nếu có thể.

    CONTEXT: Học sinh đang đọc lời giải hoặc công thức toán.
    
    YÊU CẦU XỬ LÝ:
    1. Transcript: Chuyển giọng nói sang tiếng Việt chính xác.
       - "bê bình" -> b^2
       - "bốn a xê" -> 4ac
       - "xê trên a" -> c/a
       - "âm b trên a" -> -b/a
       - "x một", "x hai" -> x1, x2
    
    2. Logic Toán học:
       - Nếu học sinh đọc công thức tổng quát (VD: "b bình trừ 4 a c"), trả về LaTeX tương ứng.
       - Nếu học sinh thay số (VD: "5 bình phương trừ 4 nhân 1 nhân 6"), HÃY TÍNH TOÁN KẾT QUẢ.
       - Kết quả tính toán phải để riêng trong trường 'calculated_result'.

    OUTPUT JSON:
    {
      "transcript": "Lời học sinh nói (tiếng Việt)",
      "latex_expression": "Biểu thức toán học dạng LaTeX (không bao gồm kết quả)",
      "calculated_result": "Kết quả số (nếu có thể tính), hoặc null",
      "is_correct_syntax": boolean (True nếu là biểu thức toán học hợp lệ),
      "feedback": "Nhận xét ngắn (VD: 'Đúng công thức Delta', 'Thay số chính xác', hoặc 'Chưa rõ biểu thức')"
    }
    `;

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            parts: [
              { inlineData: { mimeType: mimeType, data: base64Audio } },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcript: { type: Type.STRING },
              latex_expression: { type: Type.STRING },
              calculated_result: { type: Type.STRING, nullable: true },
              is_correct_syntax: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING }
            },
            required: ["transcript", "latex_expression", "is_correct_syntax", "feedback"]
          }
        }
      });

      if (!response.text) throw new Error("Empty response from AI");
      return JSON.parse(response.text) as VoiceMathResult;

    } catch (error) {
      console.error("Voice Math Analysis Error:", error);
      throw error;
    }
  }
};

// Helper: Convert Blob to Base64 (strip header)
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64Data = base64String.split(',')[1]; 
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};