import { GoogleGenAI, Type } from "@google/genai";
import { ProcessedQuestion } from "../types";

const processRawTextWithGemini = async (rawText: string, fileName: string): Promise<ProcessedQuestion[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Using gemini-3-pro-preview with Thinking Config for complex parsing logic
  // as per instructions to use thinkingBudget for complex tasks.
  const modelId = "gemini-3-pro-preview";

  const prompt = `
    Bạn là một trợ lý AI chuyên về toán học, đặc biệt là chuyên đề Hệ thức Vi-ét lớp 9 tại Việt Nam.
    Nhiệm vụ của bạn là phân tích văn bản thô được trích xuất từ file PDF "${fileName}".
    
    YÊU CẦU XỬ LÝ:
    1. Tách văn bản thành từng câu hỏi riêng biệt (Ví dụ: Bài 1, Câu 1, a, b...).
    2. LOẠI BỎ hoàn toàn phần LỜI GIẢI hoặc HƯỚNG DẪN GIẢI nếu có trong văn bản. Chỉ giữ lại đề bài.
    3. Chuẩn hóa format văn bản (sửa lỗi chính tả do OCR, định dạng lại các biểu thức toán học dạng text sang dạng dễ đọc).
    4. Trích xuất phương trình chính của bài toán (nếu có).
    5. Phân loại bài toán vào 1 trong 6 dạng cơ bản của chuyên đề Vi-ét.
    6. Đánh giá độ khó (difficulty_score) từ 0.0 (dễ nhất) đến 1.0 (khó nhất, đề thi HSG).

    INPUT TEXT:
    """
    ${rawText.substring(0, 100000)} 
    """ 
    (Note: Text truncated for safety if too large, though Pro context window is large).
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max budget for deep analysis of unstructured text
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              raw_text: { type: Type.STRING, description: "Đoạn văn bản gốc cắt ra từ input tương ứng với câu hỏi này." },
              cleaned_content: { type: Type.STRING, description: "Nội dung đề bài đã được làm sạch, loại bỏ lời giải, sửa lỗi format." },
              detected_equation: { type: Type.STRING, description: "Phương trình bậc hai hoặc hệ thức chính tìm thấy (ví dụ: x^2 - 2mx + m - 1 = 0). Null nếu không có." },
              difficulty_score: { type: Type.NUMBER, description: "Độ khó từ 0.0 đến 1.0" },
              type: { type: Type.STRING, description: "Phân loại dạng toán (Ví dụ: Tìm tham số m, Tính giá trị biểu thức...)" }
            },
            required: ["raw_text", "cleaned_content", "difficulty_score", "type"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Map to add IDs
      return data.map((item: any, index: number) => ({
        ...item,
        id: `gen_${Date.now()}_${index}`,
      }));
    }
    
    return [];

  } catch (error) {
    console.error("Gemini Processing Error:", error);
    throw new Error("Failed to process text with AI.");
  }
};

export const GeminiService = {
  processRawTextWithGemini
};