import React, { useState, useEffect } from 'react';
import { examStore } from '../../services/examStore';
import { Exam } from '../../types';
import ExamUpload from './ExamUpload';

interface ExamRepositoryProps {
  teacherId: string;
}

const ExamRepository: React.FC<ExamRepositoryProps> = ({ teacherId }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const result = await examStore.getExams(20); // Fetch 20 exams
      setExams(result.exams);
    } catch (err) {
      console.error("Failed to fetch exams:", err);
      setError("Không thể tải danh sách đề thi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleUploadSuccess = () => {
    setShowUpload(false);
    fetchExams(); // Refresh list
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Kho Đề Thi</h2>
          <p className="text-neutral-500">Quản lý và lưu trữ đề thi Hệ thức Vi-ét</p>
        </div>
        <button 
          onClick={() => setShowUpload(!showUpload)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-md flex items-center gap-2"
        >
          {showUpload ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Đóng Upload
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Thêm Đề Mới
            </>
          )}
        </button>
      </div>

      {showUpload && (
        <div className="mb-8 animate-fade-in-up">
          <ExamUpload teacherId={teacherId} onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 bg-red-50 rounded-xl border border-red-100">
          <p className="font-bold text-lg">Lỗi</p>
          <p>{error}</p>
          <button onClick={fetchExams} className="mt-4 text-sm underline hover:text-red-700">Thử lại</button>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 bg-neutral-50 rounded-xl border border-neutral-200 border-dashed">
          <svg className="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-neutral-900">Chưa có đề thi nào</h3>
          <p className="mt-1 text-sm text-neutral-500">Hãy bắt đầu bằng cách upload đề thi mới.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {exam.subject}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${exam.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-800'}`}>
                    {exam.status === 'active' ? 'Hoạt động' : 'Lưu trữ'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2 line-clamp-2" title={exam.title}>
                  {exam.title}
                </h3>
                <p className="text-sm text-neutral-500 mb-4 line-clamp-3">
                  {exam.description || "Không có mô tả."}
                </p>
                
                <div className="flex items-center text-xs text-neutral-400 gap-4 mt-auto">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {formatDate(exam.uploaded_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {exam.uploaded_by}
                  </span>
                </div>
              </div>
              
              <div className="bg-neutral-50 px-5 py-3 border-t border-neutral-100 flex justify-between items-center">
                <a 
                  href={exam.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Tải xuống
                </a>
                <button className="text-neutral-400 hover:text-neutral-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamRepository;
