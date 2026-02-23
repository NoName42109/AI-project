import { ProcessedQuestion, VietProblemType } from "../types";

export interface ValidationResult {
  validQuestions: ProcessedQuestion[];
  rejectedQuestions: ProcessedQuestion[];
}

/**
 * Strict Validation Layer
 * Ensures only high-quality Vi-ét problems enter the main database.
 */
export const validateBatch = (questions: ProcessedQuestion[]): ValidationResult => {
  const validQuestions: ProcessedQuestion[] = [];
  const rejectedQuestions: ProcessedQuestion[] = [];

  // Allowed specific sub-topics. 'OTHER' and 'INVALID' are strictly rejected.
  const ALLOWED_TOPICS = [
    VietProblemType.BASIC_SUM_PRODUCT,
    VietProblemType.FIND_M_CONDITION,
    VietProblemType.SYMMETRIC_EXPRESSION,
    VietProblemType.ASYMMETRIC_EXPRESSION,
    VietProblemType.INTEGER_SOLUTION,
    VietProblemType.RELATION_INDEPENDENT_M
  ];

  for (const q of questions) {
    let reason = "";
    let isValid = true;

    // 1. Check AI Flag first
    if (!q.is_valid_viet) {
      isValid = false;
      reason = "AI classified as Invalid Topic.";
    }
    
    // 2. Strict Topic Check (Must be one of the 6 Vi-ét types)
    else if (!ALLOWED_TOPICS.includes(q.sub_topic as VietProblemType)) {
      isValid = false;
      reason = `Topic '${q.sub_topic}' is not in the allowed Vi-ét schema.`;
    }

    // 3. Equation Check (Critical for Vi-ét)
    // Must have something that looks like an equation detected
    else if (!q.detected_equation || q.detected_equation.trim().length < 3) {
      isValid = false;
      reason = "No quadratic equation detected.";
    }

    // 4. Content sanity check
    else if (!q.cleaned_content || q.cleaned_content.length < 10) {
      isValid = false;
      reason = "Content too short or empty.";
    }

    if (isValid) {
      validQuestions.push(q);
    } else {
      rejectedQuestions.push({ ...q, rejection_reason: reason });
    }
  }

  return { validQuestions, rejectedQuestions };
};