export interface MathRegion {
  bbox?: any;
  latex: string;
  confidence: number;
}

export interface MathOcrResult {
  raw_text: string;
  math_regions: MathRegion[];
  full_latex_document: string;
  syntax_valid: boolean;
  needs_review: boolean;
}

export const mathOcrService = {
  /**
   * Scan document using Llama Cloud API with Mathpix-like architecture
   */
  async scanDocument(file: File): Promise<MathOcrResult> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/math-ocr', {
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

      return data as MathOcrResult;

    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Lỗi mạng: Không thể kết nối đến máy chủ.');
      }
      throw error;
    }
  }
};
