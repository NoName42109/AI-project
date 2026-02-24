import { db, storage, isFirebaseInitialized } from "./firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  where,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";
import { Exam } from "../types";

const EXAMS_COLLECTION = "exams";

// Mock data for fallback
const MOCK_EXAMS: Exam[] = [
  {
    id: "mock_1",
    title: "Đề kiểm tra 15 phút - Hệ thức Vi-ét (Mẫu)",
    description: "Đề mẫu cho giáo viên tham khảo.",
    file_url: "#",
    storage_path: "mock/path",
    uploaded_by: "teacher_1",
    uploaded_at: Date.now(),
    subject: "Hệ thức Vi-ét lớp 9",
    number_of_questions: 10,
    status: "active"
  }
];

export const examStore = {
  /**
   * Uploads an exam file to Firebase Storage and saves metadata to Firestore.
   */
  uploadExam: async (
    file: File, 
    metadata: Omit<Exam, "id" | "file_url" | "storage_path" | "uploaded_at">
  ): Promise<string> => {
    if (!isFirebaseInitialized) {
      console.warn("Firebase not initialized. Using mock upload.");
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      return "mock_id_" + Date.now();
    }

    try {
      // 1. Create a unique file path
      // Structure: exams/{teacher_id}/{timestamp}_{filename}
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const storagePath = `exams/${metadata.uploaded_by}/${timestamp}_${safeName}`;
      const storageRef = ref(storage, storagePath);

      // 2. Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // 3. Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 4. Save metadata to Firestore
      const examData: Omit<Exam, "id"> = {
        ...metadata,
        file_url: downloadURL,
        storage_path: storagePath,
        uploaded_at: timestamp,
      };

      const docRef = await addDoc(collection(db, EXAMS_COLLECTION), examData);
      return docRef.id;

    } catch (error) {
      console.error("Error uploading exam:", error);
      throw error;
    }
  },

  /**
   * Fetches a paginated list of exams, ordered by upload date (newest first).
   */
  getExams: async (
    pageSize: number = 10, 
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ exams: Exam[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> => {
    if (!isFirebaseInitialized) {
      console.warn("Firebase not initialized. Returning mock exams.");
      return { exams: MOCK_EXAMS, lastDoc: null };
    }

    try {
      let q = query(
        collection(db, EXAMS_COLLECTION),
        orderBy("uploaded_at", "desc"),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const exams: Exam[] = [];
      
      querySnapshot.forEach((doc) => {
        exams.push({ id: doc.id, ...doc.data() } as Exam);
      });

      const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      return { exams, lastDoc: newLastDoc };

    } catch (error) {
      console.error("Error fetching exams:", error);
      throw error;
    }
  },

  /**
   * Fetches exams uploaded by a specific teacher.
   */
  getTeacherExams: async (teacherId: string) => {
    if (!isFirebaseInitialized) {
      return MOCK_EXAMS.filter(e => e.uploaded_by === teacherId || teacherId === "teacher_1");
    }

    try {
      const q = query(
        collection(db, EXAMS_COLLECTION),
        where("uploaded_by", "==", teacherId),
        orderBy("uploaded_at", "desc")
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
    } catch (error) {
      console.error("Error fetching teacher exams:", error);
      throw error;
    }
  }
};
