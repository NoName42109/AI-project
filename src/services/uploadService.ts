import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export type UploadStep = 'idle' | 'uploading' | 'ocr' | 'normalize' | 'classifying' | 'saving' | 'done' | 'error';

export interface Question {
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  latex: string;
}

export interface ScanResult {
  isViet: boolean;
  topic: string;
  totalQuestions: number;
  questions: Question[];
}

export const uploadService = {
  async handleUpload(
    file: File, 
    userId: string,
    onProgress: (step: UploadStep, percent: number) => void
  ): Promise<ScanResult> {
    try {
      // 0. Health Check
      try {
        const healthRes = await fetch('/api/health');
        if (!healthRes.ok) console.warn("Server health check failed, proceeding anyway...");
      } catch (e) {
        console.warn("Could not reach health endpoint", e);
      }

      onProgress('uploading', 5);
      
      // Use FormData for better performance and reliability
      const formData = new FormData();
      formData.append('file', file);
      
      onProgress('uploading', 15);

      const response = await fetch('/api/math-ocr-stream', {
        method: 'POST',
        body: formData, // Browser automatically sets Content-Type to multipart/form-data
      });

      if (!response.ok) {
        let errorMsg = `Lỗi kết nối đến server (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg += `: ${errorData.message || errorData.error || JSON.stringify(errorData)}`;
        } catch (e) {
          const text = await response.text().catch(() => '');
          if (text) errorMsg += `: ${text.substring(0, 100)}`;
        }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let resultData: ScanResult | null = null;

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // keep the incomplete part in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6);
              try {
                const data = JSON.parse(dataStr);
                if (data.step === 'error') {
                  throw new Error(data.data?.message || 'Lỗi xử lý AI');
                }
                
                onProgress(data.step as UploadStep, data.percent);
                
                if (data.step === 'done') {
                  resultData = data.data;
                }
              } catch (e) {
                console.error("Error parsing stream data", e);
              }
            }
          }
        }
      }

      if (!resultData) {
        throw new Error('Không nhận được kết quả từ server');
      }

      if (!resultData.isViet) {
        onProgress('done', 100);
        return resultData;
      }

      onProgress('saving', 90);
      await this.saveExam(resultData, userId, file.name);
      onProgress('done', 100);

      return resultData;
    } catch (error) {
      onProgress('error', 0);
      throw error;
    }
  },

  async saveExam(result: ScanResult, userId: string, title: string) {
    const examData = {
      title: title,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      questionCount: result.totalQuestions || result.questions?.length || 0,
      questions: result.questions || [],
      topic: result.topic || 'he_thuc_viet',
      isViet: result.isViet,
      status: 'active'
    };

    const docRef = await addDoc(collection(db, 'exams'), examData);
    return docRef.id;
  }
};
