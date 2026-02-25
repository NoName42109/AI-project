export interface StructuredQuestion {
  id: string;
  content_latex: string;
  subQuestions: Array<{ label: string; content_latex: string }>;
  detectedDependencies: boolean;
}

export interface ScanResult {
  raw_text: string;
  latex_full: string;
  structured_questions: StructuredQuestion[];
}

export const scanExamWithLlama = async (file: File): Promise<ScanResult> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/scan-exam', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new Error('Lỗi xác thực: API Key Llama Cloud không hợp lệ.');
        case 413:
          throw new Error('Lỗi: File tải lên quá lớn. Vui lòng giảm dung lượng file.');
        case 504:
          throw new Error('Lỗi: Quá thời gian chờ (Timeout). Hệ thống Llama đang quá tải.');
        default:
          throw new Error(data.details || data.error || 'Lỗi hệ thống không xác định.');
      }
    }

    return data as ScanResult;

  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Lỗi mạng: Không thể kết nối đến máy chủ.');
    }
    throw error;
  }
};
