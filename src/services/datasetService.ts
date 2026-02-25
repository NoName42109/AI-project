import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface MerHardCase {
  original_latex: string;
  corrected_latex: string;
  confidence: number;
  math_type: string;
  created_at: number;
  source: string;
}

export const datasetService = {
  /**
   * Lưu lại các trường hợp OCR nhận diện sai (Active Learning Loop)
   * Khi giáo viên sửa lỗi trên giao diện, dữ liệu sẽ được lưu vào Firestore
   * để dùng cho việc fine-tune model sau này.
   */
  async saveHardCase(data: Omit<MerHardCase, 'created_at'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'mer_hard_cases'), {
        ...data,
        created_at: Date.now()
      });
      return docRef.id;
    } catch (error) {
      console.error("Lỗi khi lưu hard case vào dataset:", error);
      throw error;
    }
  },

  /**
   * Export toàn bộ Hard Cases thành file JSONL để train model
   */
  async exportHardCasesAsJsonl(): Promise<string> {
    try {
      const querySnapshot = await getDocs(collection(db, 'mer_hard_cases'));
      let jsonl = '';
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const record = {
          image_path: `images/hard_cases/${doc.id}.png`, // Giả lập path, thực tế cần lưu ảnh lên Storage
          latex_ground_truth: data.corrected_latex,
          original_ocr: data.original_latex,
          confidence: data.confidence,
          math_type: data.math_type,
          difficulty: 'hard'
        };
        jsonl += JSON.stringify(record) + '\n';
      });

      return jsonl;
    } catch (error) {
      console.error("Lỗi khi export dataset:", error);
      throw error;
    }
  }
};
