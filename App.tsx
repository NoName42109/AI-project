import React, { useState } from 'react';
import UploadArea from './components/UploadArea';
import QuestionCard from './components/QuestionCard';
import { extractTextFromPdf } from './services/pdfService';
import { GeminiService } from './services/geminiService';
import { ProcessedQuestion, ProcessingStatus } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'IDLE', message: '', progress: 0 });
  const [questions, setQuestions] = useState<ProcessedQuestion[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setStatus({ step: 'READING_PDF', message: 'Đang đọc nội dung PDF...', progress: 10 });
    setQuestions([]);

    try {
      // 1. Extract Text
      const pageTexts = await extractTextFromPdf(file);
      const fullText = pageTexts.join("\n\n");
      
      setStatus({ step: 'ANALYZING_AI', message: 'Gemini đang phân tích và tách câu hỏi (Thinking Mode)...', progress: 40 });

      // 2. Process with Gemini
      const processedData = await GeminiService.processRawTextWithGemini(fullText, file.name);
      
      setQuestions(processedData);
      setStatus({ step: 'COMPLETE', message: 'Hoàn tất xử lý!', progress: 100 });
    } catch (error) {
      console.error(error);
      setStatus({ step: 'ERROR', message: 'Có lỗi xảy ra trong quá trình xử lý.', progress: 0 });
    }
  };

  const handleSaveToFirestore = () => {
    // Simulation of saving to Firestore
    alert(`Đã lưu ${questions.length} câu hỏi vào collection "raw_questions" trên Firestore!`);
    // Reset
    setQuestions([]);
    setStatus({ step: 'IDLE', message: '', progress: 0 });
    setFileName("");
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
             </div>
             <div>
               <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Vi-ét Adaptive System</h1>
               <p className="text-xs text-neutral-500">Module xử lý đề thi (Teacher)</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-100">
              Gemini 3 Pro Powered
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        
        {/* Intro Section */}
        {status.step === 'IDLE' && (
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-neutral-800 mb-3">Upload tài liệu mới</h2>
            <p className="text-neutral-500 max-w-lg mx-auto">
              Hệ thống sẽ tự động trích xuất, làm sạch và phân loại các bài toán Vi-ét từ file PDF của bạn bằng AI.
            </p>
          </div>
        )}

        {/* Upload Area */}
        {status.step === 'IDLE' && (
          <UploadArea onFileSelect={handleFileSelect} />
        )}

        {/* Processing View */}
        {(status.step === 'READING_PDF' || status.step === 'ANALYZING_AI') && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-10 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
               <div className="absolute inset-0 border-4 border-neutral-100 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <svg className="w-8 h-8 text-primary-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
               </div>
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 mb-2">{status.step === 'ANALYZING_AI' ? 'AI Thinking...' : 'Processing PDF'}</h3>
            <p className="text-neutral-500 mb-6">{status.message}</p>
            
            {status.step === 'ANALYZING_AI' && (
               <div className="max-w-xs mx-auto text-xs text-primary-600 bg-primary-50 py-2 px-4 rounded-full animate-pulse">
                 Sử dụng 32k token thinking budget để phân tích sâu...
               </div>
            )}
          </div>
        )}

        {/* Error View */}
        {status.step === 'ERROR' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Xử lý thất bại</h3>
            <p className="text-red-600 mb-6">{status.message}</p>
            <button 
              onClick={() => setStatus({ step: 'IDLE', message: '', progress: 0 })}
              className="px-6 py-2 bg-white text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 font-medium transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Results View */}
        {status.step === 'COMPLETE' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full text-green-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-green-800">Xử lý thành công</h3>
                  <p className="text-xs text-green-700">Đã tách được {questions.length} câu hỏi từ "{fileName}"</p>
                </div>
              </div>
              <button 
                 onClick={handleSaveToFirestore}
                 className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 shadow-sm shadow-green-200 transition-all"
              >
                Lưu vào Firestore
              </button>
            </div>

            <div className="grid gap-6">
              {questions.map((q, idx) => (
                <QuestionCard key={q.id || idx} question={q} index={idx} />
              ))}
            </div>
            
            <div className="flex justify-center pt-6">
                <button 
                  onClick={() => { setQuestions([]); setStatus({step: 'IDLE', message: '', progress: 0}); }}
                  className="text-neutral-500 hover:text-neutral-800 text-sm font-medium underline underline-offset-4"
                >
                  Hủy bỏ & Upload file khác
                </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;