import React, { useState } from 'react';
import { examStore } from '../../services/examStore';
import { Exam } from '../../types';

interface ExamUploadProps {
  teacherId: string;
  onUploadSuccess: () => void;
}

const ExamUpload: React.FC<ExamUploadProps> = ({ teacherId, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      setError("Vui lòng chọn file và nhập tiêu đề.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const examData: Omit<Exam, "id" | "file_url" | "storage_path" | "uploaded_at"> = {
        title,
        description,
        uploaded_by: teacherId,
        subject: "Hệ thức Vi-ét lớp 9",
        number_of_questions: 10, // Default for now, could be parsed
        status: "active"
      };

      await examStore.uploadExam(file, examData);
      
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      onUploadSuccess();
      
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Có lỗi xảy ra khi upload. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-card border border-neutral-200">
      <h3 className="text-lg font-bold text-neutral-800 mb-4">Upload Đề Thi Mới</h3>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Tiêu đề đề thi</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="VD: Đề kiểm tra 15 phút - Hệ thức Vi-ét"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Mô tả (Tùy chọn)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Ghi chú thêm về đề thi..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">File đề thi (PDF, DOCX)</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer relative">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-neutral-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-neutral-600 justify-center">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-neutral-500">PDF, DOCX up to 10MB</p>
            </div>
            {file && (
              <div className="absolute inset-0 bg-white flex items-center justify-center rounded-lg border-2 border-primary-500">
                <div className="text-center">
                  <p className="text-sm font-medium text-primary-700 truncate max-w-xs">{file.name}</p>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); setFile(null); }}
                    className="text-xs text-red-500 hover:text-red-700 mt-1"
                  >
                    Xóa file
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading || !file}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${isUploading || !file ? 'bg-neutral-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'}
          `}
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang upload...
            </span>
          ) : 'Lưu vào Kho Đề'}
        </button>
      </form>
    </div>
  );
};

export default ExamUpload;
