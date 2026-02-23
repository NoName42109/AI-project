import { VietProblemType, StudentState, QuestionRecommendation, ProcessedQuestion } from "../types";

/**
 * VIETA ADAPTIVE ENGINE
 * 
 * A specialized logic engine for Grade 9 Vieta's Formulas.
 * It strictly controls the learning path based on domain dependencies.
 */

// 1. DOMAIN KNOWLEDGE GRAPH (Prerequisites)
// You cannot solve specific types efficiently without mastering the basics.
const PREREQUISITES: Record<string, VietProblemType[]> = {
  [VietProblemType.SYMMETRIC_EXPRESSION]: [VietProblemType.BASIC_SUM_PRODUCT],
  [VietProblemType.ASYMMETRIC_EXPRESSION]: [VietProblemType.SYMMETRIC_EXPRESSION, VietProblemType.FIND_M_CONDITION],
  [VietProblemType.RELATION_INDEPENDENT_M]: [VietProblemType.FIND_M_CONDITION],
  [VietProblemType.INTEGER_SOLUTION]: [VietProblemType.BASIC_SUM_PRODUCT, VietProblemType.FIND_M_CONDITION],
};

// 2. CONFIGURATION
const MASTERY_THRESHOLD_LOW = 0.4;
const MASTERY_THRESHOLD_HIGH = 0.7;
const MAX_DIFF_STEP_UP = 0.1;   // Max increase in difficulty
const MAX_DIFF_STEP_DOWN = 0.15; // Max decrease (fail fast recovery)

/**
 * Main function to calculate the next best question parameters
 */
export const recommendNextQuestion = (student: StudentState): QuestionRecommendation => {
  // Scenario A: New Student (No history)
  if (!student.recentAttempts || student.recentAttempts.length === 0) {
    return {
      targetTopic: VietProblemType.BASIC_SUM_PRODUCT,
      minDifficulty: 0.1,
      maxDifficulty: 0.3, // Start Easy
      reason: "New student: Starting with fundamentals."
    };
  }

  // Scenario B: Check for "Crisis" (3 consecutive fails)
  const last3 = student.recentAttempts.slice(0, 3); // Assuming sorted desc by time
  const isCrisis = last3.length === 3 && last3.every(a => !a.isCorrect);

  if (isCrisis) {
    const lastTopic = last3[0].subTopic as VietProblemType;
    const currentDiff = last3[0].difficultyScore;
    return {
      targetTopic: lastTopic, // Stay on topic to fix it
      minDifficulty: Math.max(0.1, currentDiff - 0.2), // Significant drop
      maxDifficulty: Math.max(0.15, currentDiff - 0.05),
      reason: "Crisis mode: 3 consecutive failures. Reducing difficulty significantly."
    };
  }

  // Scenario C: Determine Topic Rotation
  const nextTopic = selectNextTopic(student);

  // Scenario D: Calculate Target Difficulty for that Topic
  const targetDiffRange = calculateTargetDifficulty(student, nextTopic);

  return {
    targetTopic: nextTopic,
    minDifficulty: targetDiffRange.min,
    maxDifficulty: targetDiffRange.max,
    reason: `Standard adaptive path. Mastery: ${getTopicScore(student, nextTopic).toFixed(2)}`
  };
};

/**
 * HELPER: Safe access to topic score (handles the new object structure)
 */
const getTopicScore = (student: StudentState, topic: string): number => {
  const record = student.topicMastery[topic];
  return record ? record.score : 0;
};

/**
 * LOGIC: Select which sub-topic to serve next.
 * Strategies:
 * 1. Enforce Prerequisites.
 * 2. Focus on Weaknesses (if prerequisites met).
 * 3. Topic Rotation (avoid getting stuck).
 */
const selectNextTopic = (student: StudentState): VietProblemType => {
  const topics = Object.values(VietProblemType).filter(t => t !== VietProblemType.OTHER && t !== VietProblemType.INVALID);
  
  // 1. Check Prerequisites
  for (const topic of topics) {
    const reqs = PREREQUISITES[topic];
    if (reqs) {
      for (const req of reqs) {
        const mastery = getTopicScore(student, req);
        // If prerequisite mastery is too low (< 0.5), FORCE user back to prerequisite
        if (mastery < 0.5) {
          return req;
        }
      }
    }
  }

  // 2. Find Weakest Link (that is unlocked)
  // Sort topics by mastery ascending
  const sortedTopics = topics.sort((a, b) => getTopicScore(student, a) - getTopicScore(student, b));
  
  const weakestTopic = sortedTopics[0];
  const weakestMastery = getTopicScore(student, weakestTopic);

  // 3. Prevent Topic Fatigue (Don't do the same topic > 5 times in a row)
  const last5Topics = student.recentAttempts.slice(0, 5).map(a => a.subTopic);
  const isStuck = last5Topics.length === 5 && last5Topics.every(t => t === weakestTopic);

  if (isStuck) {
    // Pick the 2nd weakest or random unlocked topic to refresh
    return sortedTopics[1] || sortedTopics[0];
  }

  return weakestTopic as VietProblemType;
};

/**
 * LOGIC: Determine Difficulty Range
 */
const calculateTargetDifficulty = (student: StudentState, topic: VietProblemType): { min: number, max: number } => {
  const currentMastery = getTopicScore(student, topic);
  
  // Get last difficulty for this specific topic
  const lastAttemptForTopic = student.recentAttempts.find(a => a.subTopic === topic);
  const lastDiff = lastAttemptForTopic ? lastAttemptForTopic.difficultyScore : 0.2; // Default start diff

  let targetDiff = lastDiff;

  // Rule 1: Low Mastery (< 0.4) -> Decrease Difficulty
  if (currentMastery < MASTERY_THRESHOLD_LOW) {
    targetDiff = Math.max(0.1, lastDiff - 0.1); 
  }
  // Rule 2: Medium Mastery (0.4 - 0.7) -> Maintain or Slight Increase
  else if (currentMastery < MASTERY_THRESHOLD_HIGH) {
    // If last answer was correct, nudge up slightly, else stay
    if (lastAttemptForTopic?.isCorrect) {
      targetDiff = Math.min(1.0, lastDiff + 0.05);
    } else {
      targetDiff = lastDiff; // Consolidate
    }
  }
  // Rule 3: High Mastery (> 0.7) -> Push limit
  else {
    targetDiff = Math.min(1.0, lastDiff + MAX_DIFF_STEP_UP);
  }

  // Clamp range (Width of window is usually 0.15 to allow some variety)
  const min = Math.max(0.1, targetDiff - 0.05);
  const max = Math.min(1.0, targetDiff + 0.1);

  return { min, max };
};

/**
 * HELPER: Filter a list of candidate questions based on recommendation
 * This is used by the UI/Backend after fetching a batch of questions
 */
export const selectBestQuestion = (
  candidates: ProcessedQuestion[], 
  recommendation: QuestionRecommendation,
  historyIds: Set<string>
): ProcessedQuestion | null => {
  
  // 1. Filter by Topic and History
  const available = candidates.filter(q => 
    q.sub_topic === recommendation.targetTopic &&
    !historyIds.has(q.id)
  );

  if (available.length === 0) return null;

  // 2. Sort by closeness to target difficulty range
  // ideally inside [min, max], otherwise closest
  const targetMid = (recommendation.minDifficulty + recommendation.maxDifficulty) / 2;

  available.sort((a, b) => {
    const distA = Math.abs(a.difficulty_score - targetMid);
    const distB = Math.abs(b.difficulty_score - targetMid);
    return distA - distB;
  });

  // 3. Return best match
  return available[0];
};