import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, query, where, limit, orderBy } from "firebase/firestore";
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
      let q = collection(db, QUESTIONS_COLLECTION);
      const constraints = [];

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

      const queryRef = query(q, ...constraints);
      const querySnapshot = await getDocs(queryRef);

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
