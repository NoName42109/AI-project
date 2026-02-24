import React, { useState } from 'react';
import { llamaService } from '../services/llamaService';

export const LlamaUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Vui lòng chọn file (PDF, DOCX, Hình ảnh).');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      // Gọi service tích hợp Llama Cloud
      const extractedText = await llamaService.uploadFileToLlama(file);
      setResult(extractedText);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200 max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-bold text-neutral-800 mb-4">Quét đề bằng Llama Cloud</h2>
      
      <div className="flex flex-col gap-4">
        <input 
          type="file" 
          accept=".pdf,.docx,image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-neutral-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-primary-50 file:text-primary-700
            hover:file:bg-primary-100 cursor-pointer"
        />

        <button 
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang xử lý (có thể mất vài chục giây)...' : 'Trích xuất nội dung'}
        </button>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4">
            <h3 className="font-semibold text-neutral-700 mb-2">Kết quả trích xuất:</h3>
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
