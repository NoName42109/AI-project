import React, { useState } from 'react';
import UploadArea from './UploadArea';
import ProcessingResultView from './ProcessingResultView';
import TeacherAnalytics from './TeacherAnalytics';
import { ProcessedQuestion, ProcessingStatus, VietProblemType } from '../types';
import { pipelineOrchestrator } from '../services/pipelineOrchestrator';

const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'ANALYTICS'>('UPLOAD');
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'IDLE', message: '', progress: 0 });
  const [questions, setQuestions] = useState<ProcessedQuestion[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setQuestions([]);
    
    try {
      // Execute the New Visual Pipeline
      const results = await pipelineOrchestrator.run(file, (currentStatus) => {
        setStatus(currentStatus);
      });
      setQuestions(results);
    } catch (error: any) {
      console.error(error);
      setStatus({ step: 'ERROR', message: error.message || 'Lỗi hệ thống', progress: 0 });
    }
  };

  const handlePublish = () => {
    const validCount = questions.filter(q => q.is_valid_viet).length;
    alert(`Đã lưu ${validCount} câu hỏi Vi-ét vào kho dữ liệu (kèm hình ảnh gốc).`);
  };

  return (
    <div className="flex flex-col bg-surface">
      
      {/* Top Toolbar */}
      <header className="bg-white border-b border-neutral-200 px-4 md:px-8 py-4 sticky top-0 z-20 flex flex-col md:flex-row justify-between items-center shadow-sm gap-4 md:gap-0">
        <div className="w-full md:w-auto flex justify-between md:block">
          <div>
            <h1 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
              <span className="p-1 bg-neutral-100 rounded text-neutral-500">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              </span>
              Teacher Admin
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {activeTab === 'UPLOAD' ? (fileName ? `File: ${fileName}` : 'Chưa chọn file') : 'Báo cáo lớp học'}
            </p>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex bg-neutral-100 p-1 rounded-xl w-full md:w-auto justify-center">
           <button 
             onClick={() => setActiveTab('UPLOAD')}
             className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'UPLOAD' ? 'bg-white shadow-sm text-neutral-800' : 'text-neutral-500 hover:text-neutral-700'}`}
           >
             Scan & Phân loại
           </button>
           <button 
             onClick={() => setActiveTab('ANALYTICS')}
             className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'ANALYTICS' ? 'bg-white shadow-sm text-neutral-800' : 'text-neutral-500 hover:text-neutral-700'}`}
           >
             Phân tích Lớp học
           </button>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4 w-[240px] justify-end">
           {activeTab === 'UPLOAD' && questions.length > 0 && (
               <button 
                 onClick={handlePublish}
                 className="px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm flex items-center gap-2 shrink-0 bg-neutral-900 text-white hover:bg-neutral-800 hover:shadow-md"
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 Lưu vào Kho
               </button>
           )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* VIEW: ANALYTICS */}
          {activeTab === 'ANALYTICS' && (
             <TeacherAnalytics />
          )}

          {/* VIEW: UPLOAD & EDIT */}
          {activeTab === 'UPLOAD' && (
            <>
              {/* 1. Upload Section (visible if empty) */}
              {questions.length === 0 && status.step === 'IDLE' && (
                <div className="max-w-xl mx-auto mt-12 animate-fade-in-up">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-neutral-800 mb-2">Upload Đề thi PDF</h2>
                    <p className="text-neutral-500">Hệ thống sẽ quét, nhận diện ảnh bài toán Vi-ét và loại bỏ nội dung rác.</p>
                  </div>
                  <UploadArea onFileSelect={handleFileSelect} />
                </div>
              )}

              {/* 2. Processing State (Progress Bar) */}
              {status.step !== 'IDLE' && status.step !== 'COMPLETE' && status.step !== 'ERROR' && (
                  <div className="max-w-xl mx-auto mt-20 text-center animate-pulse">
                    <div className="flex justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                       <span>{status.step.replace('_', ' ')}</span>
                       <span>{status.progress}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-3 mb-4 overflow-hidden shadow-inner">
                        <div className="bg-primary-500 h-3 rounded-full transition-all duration-500" style={{width: `${status.progress}%`}}></div>
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-800">{status.message}</h3>
                    {status.details && (
                       <p className="text-sm text-neutral-400 mt-2">
                         Đã quét {status.details.processedBlocks} khối nội dung...
                         (Valid: <span className="text-primary-500 font-bold">{status.details.validCount}</span> | 
                          Rejected: <span className="text-neutral-500 font-bold">{status.details.rejectedCount}</span>)
                       </p>
                    )}
                  </div>
              )}
              
              {/* 3. Result View (Split Screen) */}
              {questions.length > 0 && (
                <div className="animate-fade-in-up">
                  <ProcessingResultView questions={questions} />
                  
                  <div className="flex justify-center mt-12 pb-10">
                    <button 
                      onClick={() => {
                        if(window.confirm('Dữ liệu quét chưa lưu sẽ bị mất. Upload file khác?')) {
                          setQuestions([]);
                          setStatus({step: 'IDLE', message: '', progress: 0});
                          setFileName("");
                        }
                      }}
                      className="text-neutral-400 hover:text-neutral-800 text-sm font-medium underline underline-offset-4"
                    >
                      Hủy & Upload file mới
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;