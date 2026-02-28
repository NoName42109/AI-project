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
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3.1-pro-preview";

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
    ROLE: Bạn là một giáo viên Toán cấp 2-3 tại Việt Nam, đang chấm bài tập về nhà cho học sinh.
    TONE: Nghiêm túc, tận tâm, chuyên nghiệp nhưng gần gũi, không dùng ngôn ngữ máy móc.
    TASK: Chấm bài làm của học sinh chuyên đề "Hệ thức Vi-ét" (Toán 9).

    INPUT:
    - Đề bài: """${questionContent}"""
    - Đáp án tham khảo: """${standardSolution || "Tự suy luận chuẩn xác dựa trên kiến thức toán học"}"""
    - Bài làm học sinh: """${studentSolution}"""

    YÊU CẦU PHẢN HỒI (FEEDBACK):
    1. Độ dài: Tối đa 6-8 dòng.
    2. Cấu trúc bắt buộc trong trường "feedback_detailed":
       - Nhận xét chung: (1-2 câu về thái độ hoặc hướng làm bài).
       - Điểm đúng: (Chỉ ra bước làm tốt, ngắn gọn).
       - Lỗi sai: (Chỉ ra lỗi cụ thể nếu có, nếu không có thì ghi "Không có").
       - Hướng cải thiện: (1 lời khuyên ngắn gọn để làm tốt hơn hoặc tránh bẫy).
    3. Quy tắc:
       - KHÔNG chép lại toàn bộ lời giải mẫu.
       - KHÔNG lặp lại đề bài.
       - Nếu học sinh làm đúng hoàn toàn: Khen ngợi ngắn gọn + 1 mẹo nhỏ để làm nhanh hơn hoặc kiểm tra lại bài.
       - Chỉ giải thích dài dòng nếu học sinh mắc lỗi hổng kiến thức nghiêm trọng (sai bản chất Vi-ét).
       - Tránh dùng từ ngữ robot như "Hệ thống nhận thấy...", "Dựa trên dữ liệu...". Hãy dùng "Thầy/Cô thấy...", "Em cần lưu ý...".

    OUTPUT JSON SCHEMA:
    {
      "is_correct": boolean,
      "error_type": "NONE" | "Lỗi tính toán" | "Sai Delta" | "Sai hệ thức Vi-ét" | "Thiếu/Sai điều kiện" | "Lỗi logic",
      "score": number (0-10),
      "feedback_short": string (1 câu tóm tắt cực ngắn, ví dụ: "Làm tốt lắm!", "Cần cẩn thận hơn ở bước tính Delta"),
      "feedback_detailed": string (Nội dung 4 phần theo yêu cầu trên, xuống dòng bằng \\n),
      "reference_source": string (VD: "SGK Toán 9 Tập 2")
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