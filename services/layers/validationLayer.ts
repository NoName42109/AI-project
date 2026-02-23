// services/layers/validationLayer.ts
import { ProcessedQuestion, VietProblemType } from "../../types";

/**
 * LAYER 5: Validation
 * Responsibilities:
 * - Verify content length
 * - Regex check for Quadratic Equation signature
 * - Schema validation
 */
export const validationLayer = {
  validate: (rawQuestions: any[], fileName: string): ProcessedQuestion[] => {
    return rawQuestions.map((q, index) => {
      const processed: ProcessedQuestion = {
        ...q,
        id: `q_${Date.now()}_${index}`,
        raw_text: q.cleaned_content, // Fallback
        is_valid_viet: true,
        rejection_reason: undefined,
        status: 'DRAFT',
        created_at: Date.now(),
        source_file: fileName
      };

      // Rule 1: Topic Legitimacy
      const allowedTopics = Object.values(VietProblemType);
      if (!allowedTopics.includes(processed.sub_topic as VietProblemType) || 
          processed.sub_topic === VietProblemType.INVALID || 
          processed.sub_topic === VietProblemType.OTHER) {
        processed.is_valid_viet = false;
        processed.rejection_reason = "Không thuộc chuyên đề Vi-ét lớp 9";
        return processed;
      }

      // Rule 2: Math Signature Check (Regex)
      // Must contain x^2 or x² (or variable squared)
      const quadraticRegex = /[a-z][\^]2|[a-z]²/i;
      const vietaRegex = /x[12]|nghiệm/i;
      
      const content = processed.cleaned_content.toLowerCase();
      
      if (!quadraticRegex.test(content) && !processed.detected_equation) {
        processed.is_valid_viet = false;
        processed.rejection_reason = "Không tìm thấy phương trình bậc hai";
      } else if (!vietaRegex.test(content)) {
        processed.is_valid_viet = false;
        processed.rejection_reason = "Không đề cập đến nghiệm x1, x2";
      }

      // Rule 3: Content Quality
      if (content.length < 15) {
        processed.is_valid_viet = false;
        processed.rejection_reason = "Nội dung quá ngắn";
      }

      return processed;
    });
  }
};