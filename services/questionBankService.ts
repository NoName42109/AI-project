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
import { db, isFirebaseInitialized } from "./firebase";
import { Question, DifficultyLevel } from "../types";

const COLLECTION_NAME = "questions";

export const questionBankService = {
  /**
   * Add a new question to the bank
   */
  addQuestion: async (question: Omit<Question, "id" | "createdAt">): Promise<string> => {
    if (!isFirebaseInitialized) {
      throw new Error("Firebase chưa được cấu hình. Vui lòng kiểm tra VITE_FIREBASE_* environment variables.");
    }
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...question,
        createdAt: Date.now() 
      });
      return docRef.id;
    } catch (error: any) {
      console.error("Error adding question:", error);
      if (error.code === 'permission-denied') {
        throw new Error("Lỗi quyền truy cập (Permission Denied). Vui lòng kiểm tra Firestore Rules trên Firebase Console.");
      }
      throw error;
    }
  },

  /**
   * Get a random question by difficulty
   */
  getRandomQuestion: async (difficulty: DifficultyLevel, limitCount = 20): Promise<Question | null> => {
    if (!isFirebaseInitialized) return null;
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("difficulty", "==", difficulty),
        where("status", "==", "PUBLISHED"),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const questions: Question[] = [];
      querySnapshot.forEach((doc) => {
        questions.push({ id: doc.id, ...doc.data() } as Question);
      });

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
    if (!isFirebaseInitialized) {
      throw new Error("Firebase chưa được cấu hình. Vui lòng kiểm tra VITE_FIREBASE_* environment variables.");
    }
    try {
      const promises = questions.map(q => addDoc(collection(db, COLLECTION_NAME), {
        ...q,
        createdAt: Date.now()
      }));
      await Promise.all(promises);
    } catch (error: any) {
      console.error("Error batch creating questions:", error);
      if (error.code === 'permission-denied') {
        throw new Error("Lỗi quyền truy cập (Permission Denied). Bạn cần cập nhật Firestore Rules trên Firebase Console để cho phép ghi vào collection 'questions'.");
      }
      throw error;
    }
  },

  /**
   * Get questions by difficulty for exam generation
   */
  getQuestionsByDifficulty: async (difficulty: DifficultyLevel, count: number): Promise<Question[]> => {
    if (!isFirebaseInitialized) return [];
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("difficulty", "==", difficulty),
        where("status", "==", "PUBLISHED"),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const questions: Question[] = [];
      querySnapshot.forEach((doc) => {
        questions.push({ id: doc.id, ...doc.data() } as Question);
      });

      const shuffled = questions.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    } catch (error) {
      console.error("Error getting questions by difficulty:", error);
      return [];
    }
  }
};
