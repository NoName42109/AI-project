// services/layers/aiLayer.ts
import { GoogleGenAI, Type } from "@google/genai";
import { DetectedBlock, ProcessedQuestion, VietProblemType } from "../../types";

/**
 * LAYER 3: Intelligent Analysis
 * Responsibilities:
 * - Analyze a specific Visual Block
 * - Strict Vieta filtering
 */
export const aiLayer = {
  analyzeBlock: async (block: DetectedBlock): Promise<ProcessedQuestion> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("API Key is missing in process.env.GEMINI_API_KEY");
      return {
        id: block.id,
        raw_text: block.text,
        cleaned_content: block.text,
        detected_equation: null,
        sub_topic: VietProblemType.INVALID,
        difficulty_score: 0,
        difficulty_level: 'EASY',
        has_parameter: false,
        is_multi_step: false,
        estimated_time_seconds: 0,
        is_valid_viet: false,
        rejection_reason: "Thiếu API Key (Kiểm tra .env)",
        status: 'DRAFT',
        created_at: Date.now(),
        source_file: "upload",
        page_number: block.pageIndex
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.5-flash";

    const prompt = `
    ROLE: Bạn là chuyên gia thẩm định đề thi Toán lớp 9.
    TASK: Phân loại đoạn văn bản sau có phải là bài toán "Hệ thức Vi-ét" (Vieta's Formulas) hợp lệ hay không.

    INPUT TEXT:
    """
    ${block.text}
    """

    CRITERIA (Tiêu chí CHẤP NHẬN):
    1. Phải chứa một phương trình bậc hai (dạng ax^2 + bx + c = 0).
    2. Phải đề cập đến nghiệm (x1, x2) hoặc yêu cầu tìm tham số liên quan đến nghiệm.
    3. Thuộc chương trình Toán lớp 9 Việt Nam.

    CRITERIA (Tiêu chí TỪ CHỐI):
    - Không phải phương trình bậc hai (VD: bậc nhất, bậc ba).
    - Chỉ là câu dẫn nhập chung chung ("Giải các phương trình sau").
    - Bài toán hình học, đại số không liên quan.
    - Text rác, header, footer, số trang.

    OUTPUT JSON:
    {
      "is_valid_viet": boolean,
      "rejection_reason": string (Nếu valid=false, chọn: "Không có phương trình bậc hai" | "Không có hệ thức tổng/tích" | "Nội dung không xác định" | "Khác"),
      "sub_topic": string (Nếu valid=true, chọn: "Tính tổng tích" | "Tìm tham số m" | "Biểu thức đối xứng" | "Biểu thức không đối xứng" | "Nghiệm nguyên" | "Hệ thức độc lập m"),
      "detected_equation": string (Trích xuất phương trình chính, hoặc null),
      "cleaned_content": string (Nội dung đã làm sạch, chuyển về LaTeX chuẩn),
      "difficulty_score": number (0.1 - 1.0)
    }
    `;

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_valid_viet: { type: Type.BOOLEAN },
              rejection_reason: { type: Type.STRING },
              sub_topic: { type: Type.STRING },
              detected_equation: { type: Type.STRING },
              cleaned_content: { type: Type.STRING },
              difficulty_score: { type: Type.NUMBER },
            },
            required: ["is_valid_viet", "sub_topic", "cleaned_content"]
          }
        }
      });

      if (!response.text) throw new Error("AI Empty Response");
      const result = JSON.parse(response.text);

      // Map to System Type
      const processed: ProcessedQuestion = {
        id: block.id,
        raw_text: block.text,
        cleaned_content: result.cleaned_content || block.text,
        detected_equation: result.detected_equation,
        sub_topic: result.sub_topic,
        difficulty_score: result.difficulty_score || 0.5,
        difficulty_level: result.difficulty_score < 0.4 ? 'EASY' : result.difficulty_score < 0.7 ? 'MEDIUM' : 'HARD',
        
        has_parameter: (result.cleaned_content || "").includes('m') || (result.detected_equation || "").includes('m'),
        is_multi_step: result.difficulty_score > 0.6,
        estimated_time_seconds: 300,
        
        is_valid_viet: result.is_valid_viet,
        rejection_reason: result.is_valid_viet ? undefined : result.rejection_reason,
        
        status: 'DRAFT',
        created_at: Date.now(),
        source_file: "upload",
        page_number: block.pageIndex
      };

      return processed;

    } catch (error: any) {
      console.error(`[AI Block Analysis] Error:`, error);
      // Fail safe return
      return {
        id: block.id,
        raw_text: block.text,
        cleaned_content: block.text,
        detected_equation: null,
        sub_topic: VietProblemType.INVALID,
        difficulty_score: 0,
        difficulty_level: 'EASY',
        has_parameter: false,
        is_multi_step: false,
        estimated_time_seconds: 0,
        is_valid_viet: false,
        rejection_reason: `Lỗi AI: ${error?.message || String(error)}`,
        status: 'DRAFT',
        created_at: Date.now(),
        source_file: "upload"
      };
    }
  }
};