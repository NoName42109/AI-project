import { GoogleGenAI, Type } from "@google/genai";
import { GradingResult, GradingErrorType } from "../types";

/**
 * AI GRADING ENGINE (VI-ÉT SPECIALIST)
 * 
 * Analyzes student solutions for logic, calculation, and constraint errors.
 * Provides constructive feedback grounded in official textbooks.
 */
export const gradingEngine = {
  gradeSubmission: async (
    questionContent: string,
    studentSolution: string,
    standardSolution?: string
  ): Promise<GradingResult> => {
    
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-pro-preview";

    // Skip AI if empty
    if (!studentSolution || studentSolution.trim().length < 2) {
      return {
        is_correct: false,
        error_type: GradingErrorType.EMPTY,
        score: 0,
        feedback_short: "Bạn chưa nhập lời giải.",
        feedback_detailed: "Hãy thử nháp bài ra giấy rồi nhập vào đây nhé!",
        reference_source: "Hệ thống nhắc nhở"
      };
    }

    const prompt = `
    ROLE: Bạn là Chuyên gia Giáo dục Toán học bậc THCS tại Việt Nam (Senior Math Educator).
    TASK: Chấm bài làm của học sinh chuyên đề "Hệ thức Vi-ét" (Toán 9).

    INPUT:
    - Đề bài: """${questionContent}"""
    - Đáp án tham khảo (nếu có): """${standardSolution || "Tự suy luận chuẩn xác"}"""
    - Bài làm học sinh: """${studentSolution}"""

    YÊU CẦU CHẤM ĐIỂM & GROUNDING (Quan trọng):
    1. **Tính chính xác**: Kết quả cuối cùng phải đúng.
    2. **Tính logic**: Các bước biến đổi đại số phải hợp lệ.
    3. **Tính linh hoạt**: 
       - Chấp nhận mọi cách giải đúng (VD: Học sinh không dùng cách trong đáp án mẫu mà dùng Hằng đẳng thức khác, hoặc đặt ẩn phụ, miễn là logic đúng).
       - Không ép buộc theo một khuôn mẫu duy nhất.
    4. **Tham chiếu nguồn (Grounding)**:
       - Mọi nhận xét về phương pháp phải dựa trên: "SGK Toán 9 (NXB Giáo dục)", "Sách Bài Tập Toán 9", hoặc "Cấu trúc đề thi tuyển sinh vào 10".
       - Tuyệt đối KHÔNG bịa đặt nguồn, không dẫn nguồn blog cá nhân/forum.
       - Nếu học sinh sai, hãy trích dẫn: "Theo phương pháp chuẩn trong SGK Toán 9..."

    PHÂN TÍCH LỖI SAI (Nếu có):
    - Kiểm tra kỹ điều kiện Delta (Delta >= 0) để phương trình có nghiệm. Đây là lỗi thường gặp nhất.
    - Kiểm tra dấu của tổng/tích (S = -b/a, P = c/a).
    - Kiểm tra điều kiện ràng buộc của tham số m ở bước cuối cùng.

    OUTPUT JSON SCHEMA:
    {
      "is_correct": boolean,
      "error_type": "NONE" | "Lỗi tính toán" | "Sai Delta" | "Sai hệ thức Vi-ét" | "Thiếu/Sai điều kiện" | "Lỗi logic",
      "score": number (0-10),
      "feedback_short": string (1 câu ngắn gọn, tích cực),
      "feedback_detailed": string (Giải thích chi tiết, chỉ rõ lỗi ở bước nào: Delta, Vi-ét, hay Kết luận),
      "reference_source": string (VD: "Theo SGK Toán 9 - Tập 2, trang 58" hoặc "Dựa trên phương pháp giải bài tập Toán 9")
    }
    `;

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 4096 }, // Moderate budget for grading logic
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_correct: { type: Type.BOOLEAN },
              error_type: { 
                type: Type.STRING, 
                enum: [
                  "NONE", 
                  "Lỗi tính toán", 
                  "Sai Delta", 
                  "Sai hệ thức Vi-ét", 
                  "Thiếu/Sai điều kiện", 
                  "Lỗi logic"
                ] 
              },
              score: { type: Type.NUMBER },
              feedback_short: { type: Type.STRING },
              feedback_detailed: { type: Type.STRING },
              reference_source: { type: Type.STRING }
            },
            required: ["is_correct", "error_type", "score", "feedback_short", "feedback_detailed", "reference_source"]
          }
        }
      });

      if (!response.text) throw new Error("AI trả về rỗng");
      
      const rawResult = JSON.parse(response.text);

      // Map string enum from AI to TypeScript Enum
      let mappedError = GradingErrorType.LOGIC_ERROR;
      switch (rawResult.error_type) {
        case "NONE": mappedError = GradingErrorType.NONE; break;
        case "Lỗi tính toán": mappedError = GradingErrorType.CALCULATION_ERROR; break;
        case "Sai Delta": mappedError = GradingErrorType.DELTA_ERROR; break;
        case "Sai hệ thức Vi-ét": mappedError = GradingErrorType.VIETA_ERROR; break;
        case "Thiếu/Sai điều kiện": mappedError = GradingErrorType.CONDITION_ERROR; break;
        case "Lỗi logic": mappedError = GradingErrorType.LOGIC_ERROR; break;
      }

      return {
        is_correct: rawResult.is_correct,
        error_type: mappedError,
        score: rawResult.score,
        feedback_short: rawResult.feedback_short,
        feedback_detailed: rawResult.feedback_detailed,
        reference_source: rawResult.reference_source
      };

    } catch (error) {
      console.error("Grading Error:", error);
      // Fallback in case of AI failure
      return {
        is_correct: false,
        error_type: GradingErrorType.LOGIC_ERROR,
        score: 0,
        feedback_short: "Hệ thống đang bận, chưa thể chấm bài ngay.",
        feedback_detailed: "Vui lòng thử lại sau giây lát.",
        reference_source: "Hệ thống"
      };
    }
  }
};