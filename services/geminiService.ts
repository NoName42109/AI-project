import { GoogleGenAI, Type } from "@google/genai";
import { ProcessedQuestion } from "../types";

const processRawTextWithGemini = async (rawText: string, fileName: string): Promise<ProcessedQuestion[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Use gemini-3-pro-preview for deep reasoning capabilities
  const modelId = "gemini-3-pro-preview";

  const prompt = `
    Bạn là một chuyên gia AI về toán học, chuyên sâu về chuyên đề "Hệ thức Vi-ét" (Vieta's Formulas) trong chương trình Toán lớp 9 Việt Nam.
    
    INPUT: Nội dung văn bản thô từ file PDF "${fileName}".
    
    NHIỆM VỤ:
    1. Tách văn bản thành danh sách các câu hỏi riêng biệt.
    2. Phân tích từng câu hỏi và TRÍCH XUẤT các thông tin metadata chi tiết.
    3. ĐÁNH GIÁ ĐỘ KHÓ dựa trên bảng quy tắc (Rubric) bên dưới.

    ----------------------------------------------------------------
    BẢNG QUY TẮC TÍNH ĐIỂM ĐỘ KHÓ (DIFFICULTY SCORE RUBRIC)
    Yêu cầu tuân thủ tuyệt đối các khoảng điểm sau dựa trên đặc điểm bài toán:

    MỨC 1: EASY (0.1 - 0.3)
    - Dạng bài: Thay số trực tiếp, không chứa tham số hoặc tham số đã cho trước giá trị.
    - Yêu cầu: Tính tổng (S), tích (P), hoặc giá trị biểu thức rất đơn giản.
    - Không cần xét điều kiện Delta.

    MỨC 2: MEDIUM (0.4 - 0.6)
    - Dạng bài: Bài toán cơ bản chứa tham số m.
    - Yêu cầu: 
      + Phải tìm điều kiện để phương trình có nghiệm (Delta >= 0).
      + Tính giá trị biểu thức đối xứng cơ bản (x1^2 + x2^2, x1^3 + x2^3).
      + Tìm m để biểu thức đạt giá trị cho trước (VD: x1^2 + x2^2 = 10).

    MỨC 3: HARD (0.7 - 0.8)
    - Dạng bài: Đa bước, tính toán phức tạp.
    - Yêu cầu:
      + Biểu thức KHÔNG đối xứng (VD: x1 - 2x2 = 5, 2x1 + x2 = m).
      + Biểu thức chứa giá trị tuyệt đối (|x1 - x2|) hoặc căn thức.
      + Hệ thức giữa các nghiệm độc lập với m.
      + Xét dấu nghiệm chi tiết (2 nghiệm dương phân biệt, 2 nghiệm trái dấu, x1 < 1 < x2...).

    MỨC 4: EXPERT (0.9 - 1.0)
    - Dạng bài: Bài toán cực trị, tối ưu hóa hoặc số học.
    - Yêu cầu:
      + Tìm m để biểu thức đạt Giá trị nhỏ nhất (Min) hoặc Lớn nhất (Max).
      + Tìm m nguyên để phương trình có nghiệm nguyên.
      + Các bài toán kết hợp nhiều điều kiện khó (Delta chính phương, nghiệm nguyên tố...).
    ----------------------------------------------------------------

    TIÊU CHÍ PHÂN LOẠI KHÁC:
    A. sub_topic:
       - "Tính tổng tích": Chỉ tính toán S, P, biểu thức.
       - "Tìm tham số m": Tìm m thỏa mãn hệ thức cho trước.
       - "Biểu thức đối xứng": Cụ thể là tính/xử lý x1^n + x2^n.
       - "Biểu thức không đối xứng": Hệ số x1, x2 không giống nhau.
       - "Nghiệm nguyên": Liên quan đến tập số nguyên Z.
       - "Hệ thức độc lập m": Tìm hệ thức khử m.
       
    B. Metadata:
       - has_parameter: True nếu phương trình có tham số (m, k...).
       - is_multi_step: True nếu cần > 2 bước logic (VD: Delta -> Viét -> Biến đổi -> Kết luận).
       - difficulty_level: Tự động map theo score (EASY, MEDIUM, HARD, EXPERT).

    INPUT TEXT:
    """
    ${rawText.substring(0, 200000)} 
    """ 
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              raw_text: { type: Type.STRING, description: "Raw extracted text segment" },
              cleaned_content: { type: Type.STRING, description: "Question text only, no solutions" },
              solution: { type: Type.STRING, description: "Extracted solution text if present" },
              detected_equation: { type: Type.STRING, description: "Main quadratic equation detected" },
              
              sub_topic: { 
                type: Type.STRING, 
                enum: [
                  "Tính tổng tích", "Tìm tham số m", "Biểu thức đối xứng", 
                  "Biểu thức không đối xứng", "Nghiệm nguyên", "Hệ thức độc lập m", 
                  "Khác", "Không phải Vi-ét"
                ] 
              },
              difficulty_score: { type: Type.NUMBER, description: "Exact score from 0.0 to 1.0 based on the rubric" },
              difficulty_level: { type: Type.STRING, enum: ["EASY", "MEDIUM", "HARD", "EXPERT"] },
              has_parameter: { type: Type.BOOLEAN, description: "True if equation has parameter m, k..." },
              is_multi_step: { type: Type.BOOLEAN },
              estimated_time_seconds: { type: Type.NUMBER },
              is_valid_viet: { type: Type.BOOLEAN, description: "Is this a valid Vieta/Quadratic problem?" }
            },
            required: ["cleaned_content", "sub_topic", "difficulty_score", "difficulty_level", "has_parameter", "is_valid_viet"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
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