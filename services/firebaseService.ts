import { db } from "./firebase";
import { collection, addDoc, getDocs, query, where, limit, orderBy, QueryConstraint } from "firebase/firestore";
import { ProcessedQuestion, VietProblemType, DifficultyLevel } from "../types";

const QUESTIONS_COLLECTION = "questions";

export const firebaseService = {
  /**
   * Save a processed question to Firestore
   */
  async saveQuestion(question: ProcessedQuestion): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, QUESTIONS_COLLECTION), question);
      console.log("Document written with ID: ", docRef.id);
      return docRef.id;
    } catch (e) {
      console.error("Error adding document: ", e);
      throw e;
    }
  },

  /**
   * Save multiple questions in batch (sequentially for now)
   */
  async saveQuestions(questions: ProcessedQuestion[]): Promise<void> {
    for (const q of questions) {
      await this.saveQuestion(q);
    }
  },

  /**
   * Fetch questions from Firestore based on criteria
   */
  async getQuestions(
    topic: VietProblemType | null, 
    difficulty: DifficultyLevel | null, 
    limitCount: number = 20
  ): Promise<ProcessedQuestion[]> {
    try {
      const constraints: QueryConstraint[] = [];
      
      if (topic) {
        constraints.push(where("sub_topic", "==", topic));
      }
      
      if (difficulty) {
        constraints.push(where("difficulty_level", "==", difficulty));
      }

      // Add status check
      constraints.push(where("status", "==", "PUBLISHED"));

      // Limit
      constraints.push(limit(limitCount));

      const q = query(collection(db, QUESTIONS_COLLECTION), ...constraints);
      const querySnapshot = await getDocs(q);

      const questions: ProcessedQuestion[] = [];
      querySnapshot.forEach((doc) => {
        questions.push({ id: doc.id, ...doc.data() } as ProcessedQuestion);
      });

      return questions;
    } catch (e) {
      console.error("Error fetching documents: ", e);
      return [];
    }
  }
};
