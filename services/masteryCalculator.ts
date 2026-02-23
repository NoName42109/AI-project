/**
 * MASTERY CALCULATOR ENGINE (VI-ÉT MODULE)
 * 
 * Implements the mathematical formula:
 * Mastery = f(accuracy, difficulty, time_efficiency, recency)
 */

interface MasteryInput {
  currentMastery: number;      // Current score (0.0 - 1.0)
  lastAttemptAt: number;       // Timestamp of previous attempt
  questionDifficulty: number;  // Difficulty of current question (0.0 - 1.0)
  isCorrect: boolean;          // Result
  timeSpentSeconds: number;    // Actual time taken
  estimatedTimeSeconds: number;// Expected time
  consecutiveFailures: number; // Streak of wrong answers in this topic
}

const DECAY_RATE_PER_DAY = 0.05; // Lose 5% per day of inactivity
const MAX_DECAY = 0.2;           // Max decay cap (20%)
const LEARNING_RATE = 0.2;       // How fast we move towards new performance level
const TIME_BONUS_CAP = 1.2;      // Max multiplier for being fast
const TIME_PENALTY_FLOOR = 0.8;  // Min multiplier for being slow

export const calculateNewMastery = (input: MasteryInput): number => {
  const {
    currentMastery,
    lastAttemptAt,
    questionDifficulty,
    isCorrect,
    timeSpentSeconds,
    estimatedTimeSeconds,
    consecutiveFailures
  } = input;

  let score = currentMastery;
  const now = Date.now();

  // =================================================================
  // 1. TIME DECAY (Forgetting Curve)
  // If > 24 hours since last practice, reduce score
  // =================================================================
  if (lastAttemptAt > 0) {
    const daysSince = (now - lastAttemptAt) / (1000 * 60 * 60 * 24);
    if (daysSince > 1) {
      // Exponential-like decay but capped
      // Formula: Score * (1 - rate)^days
      // We clamp days to 4 to prevent total reset (max 20% loss)
      const effectiveDays = Math.min(daysSince, 4);
      const decayFactor = Math.pow(1 - DECAY_RATE_PER_DAY, effectiveDays);
      score *= decayFactor;
    }
  }

  // =================================================================
  // 2. ACCURACY & DIFFICULTY PROCESSING
  // =================================================================
  if (isCorrect) {
    // --- SCENARIO: CORRECT ---

    // A. Time Efficiency Bonus
    // If student is faster than estimated time, they likely mastered it.
    // We assume estimatedTime is for an average student.
    // Ratio > 1.0 means fast. Ratio < 1.0 means slow.
    // Constraint: Don't reward guessing (usually < 10s). Handled by UI/Backend usually, 
    // but here we just cap the bonus.
    let timeRatio = estimatedTimeSeconds / Math.max(timeSpentSeconds, 10);
    timeRatio = Math.min(TIME_BONUS_CAP, Math.max(TIME_PENALTY_FLOOR, timeRatio));

    // B. Performance Value
    // A correct answer demonstrates a performance level roughly equal to 
    // the question's difficulty * time_efficiency.
    // Solving a 0.8 diff question 20% faster => Performance ~0.96
    let performanceValue = questionDifficulty * timeRatio;
    performanceValue = Math.min(1.0, performanceValue);

    // C. Growth Logic
    if (performanceValue > score) {
      // GROWTH: Student outperformed their current level.
      // Move score towards performanceValue based on Learning Rate.
      score += (performanceValue - score) * LEARNING_RATE;
    } else {
      // CONSOLIDATION: Student solved an easier problem correctly.
      // Small reward for practice, but doesn't spike mastery.
      score += 0.01;
    }

  } else {
    // --- SCENARIO: INCORRECT ---

    if (questionDifficulty > score) {
      // EXPECTED FAILURE: Tried a hard problem and failed.
      // Small penalty. We want to encourage trying hard things.
      score -= 0.02;
    } else {
      // CARELESS / GAP: Failed a problem below their level.
      // Heavier penalty.
      // The larger the gap (Score - Diff), the larger the penalty.
      // E.g. Mastery 0.8, Failed 0.2 => Big drop.
      const gap = score - questionDifficulty;
      const penalty = 0.05 + (gap * 0.15); 
      score -= penalty;
    }
  }

  // =================================================================
  // 3. CONSECUTIVE FAILURE PENALTY (Crisis Mode)
  // =================================================================
  // If student fails 3 times in a row, the Adaptive Engine will likely 
  // lower difficulty, but the Mastery score must also drop significantly
  // to reflect this "stuck" state.
  if (!isCorrect && consecutiveFailures >= 3) {
    score *= 0.85; // Slash 15% of total mastery
  }

  // =================================================================
  // 4. CLAMPING
  // =================================================================
  return parseFloat(Math.max(0.0, Math.min(1.0, score)).toFixed(3));
};