import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  doc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { Question, DifficultyLevel } from "../types";

const COLLECTION_NAME = "questions";

export const questionBankService = {
  /**
   * Add a new question to the bank
   */
  addQuestion: async (question: Omit<Question, "id" | "createdAt">): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...question,
        createdAt: Date.now() // Use client timestamp for simplicity, or serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding question:", error);
      throw error;
    }
  },

  /**
   * Get a random question by difficulty
   * Note: Firestore doesn't support random selection natively.
   * We'll fetch a batch and pick one randomly.
   */
  getRandomQuestion: async (difficulty: DifficultyLevel, limitCount = 20): Promise<Question | null> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("difficulty", "==", difficulty),
        where("status", "==", "PUBLISHED"), // Assuming we only want published questions
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const questions: Question[] = [];
      querySnapshot.forEach((doc) => {
        questions.push({ id: doc.id, ...doc.data() } as Question);
      });

      // Pick random
      const randomIndex = Math.floor(Math.random() * questions.length);
      return questions[randomIndex];
    } catch (error) {
      console.error("Error getting random question:", error);
      return null;
    }
  },

  /**
   * Batch create questions (for teacher upload)
   */
  batchCreateQuestions: async (questions: Omit<Question, "id" | "createdAt">[]): Promise<void> => {
    try {
      const promises = questions.map(q => addDoc(collection(db, COLLECTION_NAME), {
        ...q,
        createdAt: Date.now()
      }));
      await Promise.all(promises);
    } catch (error) {
      console.error("Error batch creating questions:", error);
      throw error;
    }
  },

  /**
   * Get questions by difficulty for exam generation
   */
  getQuestionsByDifficulty: async (difficulty: DifficultyLevel, count: number): Promise<Question[]> => {
    try {
      // In a real app with many questions, we'd need a better strategy than fetching all and shuffling
      // For now, fetch a reasonable limit and shuffle
      const q = query(
        collection(db, COLLECTION_NAME),
        where("difficulty", "==", difficulty),
        where("status", "==", "PUBLISHED"),
        limit(50) // Fetch more than needed to ensure randomness
      );

      const querySnapshot = await getDocs(q);
      const questions: Question[] = [];
      querySnapshot.forEach((doc) => {
        questions.push({ id: doc.id, ...doc.data() } as Question);
      });

      // Shuffle and slice
      const shuffled = questions.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    } catch (error) {
      console.error("Error getting questions by difficulty:", error);
      return [];
    }
  }
};
