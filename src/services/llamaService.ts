/**
 * Service tích hợp Llama Cloud API để trích xuất nội dung từ file (PDF, DOCX, Ảnh).
 * 
 * BẢO MẬT:
 * - Không hard-code API Key.
 * - Sử dụng VITE_LLAMA_API_KEY cho môi trường local/frontend.
 * - Khuyến nghị: Trong production, nên tạo một Vercel Serverless Function (ví dụ: /api/parse)
 *   và gọi từ frontend để giấu hoàn toàn API Key.
 */

export const llamaService = {
  /**
   * Upload file lên Llama Cloud và chờ kết quả trả về.
   * @param file File (PDF, DOCX, Image)
   * @returns Nội dung đã trích xuất dưới dạng Markdown/Text
   */
  async uploadFileToLlama(file: File): Promise<string> {
    const apiKey = import.meta.env.VITE_LLAMA_API_KEY;
    
    if (!apiKey) {
      throw new Error("Lỗi cấu hình: Thiếu VITE_LLAMA_API_KEY trong file .env");
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Gửi file lên LlamaParse API
      const uploadResponse = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        await this.handleError(uploadResponse);
      }

      const uploadData = await uploadResponse.json();
      const jobId = uploadData.id;

      if (!jobId) {
        throw new Error("Không nhận được Job ID từ Llama Cloud.");
      }

      // 2. Polling (Kiểm tra liên tục) để lấy kết quả
      return await this.pollLlamaResult(jobId, apiKey);

    } catch (error: any) {
      console.error("[LlamaService] Error:", error);
      
      // Xử lý lỗi network hoặc timeout
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error("Lỗi mạng: Không thể kết nối tới Llama Cloud. Vui lòng kiểm tra kết nối internet.");
      }
      
      throw error;
    }
  },

  /**
   * Polling API để lấy kết quả sau khi upload
   */
  async pollLlamaResult(jobId: string, apiKey: string, maxRetries = 30): Promise<string> {
    const delayMs = 2000; // Đợi 2 giây mỗi lần kiểm tra

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const response = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.status === 200) {
        const data = await response.json();
        return data.markdown || data.text || "Không có nội dung trích xuất.";
      } else if (response.status === 202) {
        // 202: Đang xử lý, tiếp tục chờ
        continue;
      } else {
        // Lỗi khác
        await this.handleError(response);
      }
    }

    throw new Error("Timeout: Llama Cloud xử lý quá lâu. Vui lòng thử lại với file nhỏ hơn.");
  },

  /**
   * Xử lý các mã lỗi HTTP từ Llama Cloud
   */
  async handleError(response: Response) {
    const status = response.status;
    let errorMsg = "Lỗi không xác định từ server.";
    
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorData.message || errorMsg;
    } catch (e) {
      errorMsg = await response.text();
    }

    if (status === 401 || status === 403) {
      throw new Error("Lỗi 401/403: API Key Llama Cloud không hợp lệ hoặc đã hết hạn.");
    }
    if (status === 413) {
      throw new Error("Lỗi 413: File upload quá lớn so với giới hạn của Llama Cloud.");
    }
    if (status === 429) {
      throw new Error("Lỗi 429: Vượt quá giới hạn rate limit của Llama Cloud. Vui lòng thử lại sau.");
    }
    if (status >= 500) {
      throw new Error(`Lỗi Server Llama Cloud (${status}). Vui lòng thử lại sau.`);
    }
    
    throw new Error(`Lỗi ${status}: ${errorMsg}`);
  }
};
