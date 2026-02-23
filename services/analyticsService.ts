import { ClassAnalytics, GradingErrorType, VietProblemType } from "../types";

/**
 * ANALYTICS SERVICE
 * Aggregates student data to provide insights for teachers.
 */

// MOCK DATA GENERATOR (Since we don't have a live DB with 30 students yet)
// This simulates a class of 30 students with realistic Grade 9 performance patterns.
export const generateMockClassAnalytics = (): ClassAnalytics => {
  const studentCount = 32;
  const totalQuestionsSolved = 1450;
  
  // 1. Topic Performance Simulation
  // "Find m" and "Asymmetric Expressions" are typically harder for students.
  const topicPerformance = [
    { 
      topic: VietProblemType.BASIC_SUM_PRODUCT, 
      accuracy: 92, avgTimeSeconds: 45, attemptCount: 400, difficultyRating: 0.2 
    },
    { 
      topic: VietProblemType.SYMMETRIC_EXPRESSION, 
      accuracy: 78, avgTimeSeconds: 120, attemptCount: 350, difficultyRating: 0.4 
    },
    { 
      topic: VietProblemType.FIND_M_CONDITION, 
      accuracy: 65, avgTimeSeconds: 180, attemptCount: 300, difficultyRating: 0.5 
    },
    { 
      topic: VietProblemType.RELATION_INDEPENDENT_M, 
      accuracy: 55, avgTimeSeconds: 210, attemptCount: 150, difficultyRating: 0.6 
    },
    { 
      topic: VietProblemType.ASYMMETRIC_EXPRESSION, 
      accuracy: 42, avgTimeSeconds: 300, attemptCount: 150, difficultyRating: 0.8 
    },
    { 
      topic: VietProblemType.INTEGER_SOLUTION, 
      accuracy: 30, avgTimeSeconds: 350, attemptCount: 100, difficultyRating: 0.9 
    },
  ];

  // 2. Error Distribution Simulation
  // Students often forget Delta conditions or make sign errors in Vieta.
  const errorDistribution = [
    { type: GradingErrorType.CALCULATION_ERROR, count: 120, percentage: 25 },
    { type: GradingErrorType.DELTA_ERROR, count: 80, percentage: 17 },
    { type: GradingErrorType.CONDITION_ERROR, count: 150, percentage: 32 }, // Most common: Forgot "Delta >= 0"
    { type: GradingErrorType.VIETA_ERROR, count: 70, percentage: 15 },
    { type: GradingErrorType.LOGIC_ERROR, count: 50, percentage: 11 },
  ];

  // 3. Difficulty Breakdown
  const difficultyBreakdown = {
    EASY: 95,
    MEDIUM: 72,
    HARD: 45,
    EXPERT: 15
  };

  // 4. Identify Weakest Topics (Accuracy < 50%)
  const weakestTopics = topicPerformance
    .filter(t => t.accuracy < 55)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map(t => t.topic);

  // 5. Common Pitfalls
  const commonPitfalls = errorDistribution
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(e => e.type);

  return {
    totalStudents: studentCount,
    averageMastery: 68, // Class average
    questionsSolvedTotal: totalQuestionsSolved,
    topicPerformance,
    errorDistribution,
    difficultyBreakdown,
    weakestTopics,
    commonPitfalls
  };
};

export const AnalyticsService = {
  getClassAnalytics: async (): Promise<ClassAnalytics> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return generateMockClassAnalytics();
  }
};