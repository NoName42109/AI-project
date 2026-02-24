import React, { useState, useEffect } from 'react';
import { ProcessedQuestion, VietProblemType, GradingResult, VoiceMathResult, VoiceSubmissionResult, DifficultyLevel } from '../types';
import { gradingEngine } from '../services/gradingEngine';
import { voiceGradingService } from '../services/voiceGradingService';
import { questionBankService } from '../services/questionBankService';
import GradingFeedback from './GradingFeedback';
import VoiceInput from './VoiceInput';
import VoiceSubmission from './VoiceSubmission';
import VoiceResultView from './VoiceResultView';

interface StudentPracticeViewProps {
  onBack: () => void;
}

const StudentPracticeView: React.FC<StudentPracticeViewProps> = ({ onBack }) => {
  const [question, setQuestion] = useState<ProcessedQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Submission Mode
  const [submissionMode, setSubmissionMode] = useState<'TEXT' | 'VOICE'>('TEXT');

  // Text Submission State
  const [studentAnswer, setStudentAnswer] = useState("");
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [voiceInputResult, setVoiceInputResult] = useState<VoiceMathResult | null>(null); // Helper for text input

  // Voice Submission State
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceSubmissionResult, setVoiceSubmissionResult] = useState<VoiceSubmissionResult | null>(null);

  const [isGrading, setIsGrading] = useState(false);

  const fetchRandomQuestion = async () => {
    setIsLoading(true);
    try {
      // Simple random difficulty logic for now
      const difficulties: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];
      const randomDiff = difficulties[Math.floor(Math.random() * difficulties.length)];
      
      const q = await questionBankService.getRandomQuestion(randomDiff);
      
      if (q) {
        // Map Question to ProcessedQuestion
        const processed: ProcessedQuestion = {
          id: q.id,
          raw_text: q.content_latex,
          cleaned_content: q.content_latex,
          detected_equation: (q as any).detected_equation || null,
          sub_topic: q.sub_topic as VietProblemType || VietProblemType.OTHER,
          difficulty_score: q.difficulty === 'EASY' ? 0.3 : q.difficulty === 'MEDIUM' ? 0.5 : 0.8,
          difficulty_level: q.difficulty,
          has_parameter: false, // Metadata lost in simple mapping, assume false or check content
          is_multi_step: q.difficulty !== 'EASY',
          estimated_time_seconds: 300,
          is_valid_viet: true,
          status: 'PUBLISHED',
          created_at: q.createdAt,
          source_file: "Question Bank"
        };
        setQuestion(processed);
      } else {
        alert("Không tìm thấy câu hỏi nào trong kho dữ liệu.");
      }
    } catch (error) {
      console.error("Error fetching question:", error);
      alert("Lỗi tải câu hỏi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomQuestion();
  }, []);

  const handleSubmit = async () => {
    if (!question) return;
    if (submissionMode === 'TEXT' && !studentAnswer.trim()) return;
    if (submissionMode === 'VOICE' && !voiceBlob) return;

    setIsGrading(true);
    try {
      if (submissionMode === 'TEXT') {
        const result = await gradingEngine.gradeSubmission(
          question.cleaned_content,
          studentAnswer,
          undefined // No standard solution available
        );
        setGradingResult(result);
      } else {
        // Voice Submission
        if (voiceBlob) {
          const result = await voiceGradingService.processAudioSubmission(voiceBlob);
          setVoiceSubmissionResult(result);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi khi chấm bài. Vui lòng thử lại.");
    } finally {
      setIsGrading(false);
    }
  };

  const handleNextQuestion = () => {
    setStudentAnswer("");
    setGradingResult(null);
    setVoiceInputResult(null);
    setVoiceBlob(null);
    setVoiceSubmissionResult(null);
    fetchRandomQuestion();
  };

  const handleVoiceInputResult = (result: VoiceMathResult) => {
    setVoiceInputResult(result);
    if (result.is_correct_syntax) {
      const mathLine = result.calculated_result 
        ? `${result.latex_expression} = ${result.calculated_result}` 
        : result.latex_expression;
      
      setStudentAnswer(prev => prev + (prev ? "\n" : "") + mathLine);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface">
        <p className="text-neutral-500 mb-4">Không có dữ liệu câu hỏi.</p>
        <button onClick={onBack} className="text-primary-600 hover:underline">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface animate-fade-in-up">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span className="font-medium text-sm">Thoát</span>
        </button>
        
        <div className="flex flex-col items-center">
           <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Luyện tập thích ứng</span>
           <span className="text-sm font-semibold text-primary-600">{question.sub_topic}</span>
        </div>

        <div className="w-20"></div> {/* Spacer for center alignment */}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT: Question Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-card border border-neutral-100 sticky top-4">
              <div className="flex items-center gap-3 mb-6">
                 <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-600`}>
                    {question.difficulty_level}
                 </span>
              </div>
              
              <div className="math-content text-xl text-neutral-800 leading-loose">
                {question.cleaned_content}
              </div>

              {question.detected_equation && (
                 <div className="mt-8 p-4 bg-pastel-blue rounded-xl flex items-center justify-center">
                    <code className="text-lg font-serif font-bold text-primary-800">
                      {question.detected_equation}
                    </code>
                 </div>
              )}
            </div>
          </div>

          {/* RIGHT: Answer Column */}
          <div className="space-y-6 flex flex-col">
            
            {/* Submission Mode Tabs */}
            {!gradingResult && !voiceSubmissionResult && (
              <div className="flex bg-neutral-100 p-1 rounded-xl mb-2">
                <button 
                  onClick={() => setSubmissionMode('TEXT')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${submissionMode === 'TEXT' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  Nhập văn bản
                </button>
                <button 
                  onClick={() => setSubmissionMode('VOICE')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${submissionMode === 'VOICE' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  Nộp bằng giọng nói
                </button>
              </div>
            )}

            {/* Input Area */}
            {!gradingResult && !voiceSubmissionResult && (
              <div className="bg-white rounded-2xl p-1 shadow-card border border-neutral-200 flex-1 flex flex-col min-h-[500px] relative">
                
                {submissionMode === 'TEXT' ? (
                  <>
                    {/* Voice Input Helper Result Overlay */}
                    {voiceInputResult && (
                      <div className="mx-4 mt-4 p-3 bg-neutral-900 text-white rounded-xl shadow-lg flex flex-col gap-1 animate-fade-in-up">
                        <div className="flex justify-between items-start">
                           <span className="text-xs text-neutral-400 uppercase font-bold">AI nghe được:</span>
                           <button onClick={() => setVoiceInputResult(null)} className="text-neutral-500 hover:text-white">&times;</button>
                        </div>
                        <p className="italic text-neutral-300 text-sm">"{voiceInputResult.transcript}"</p>
                        
                        <div className="mt-2 pt-2 border-t border-neutral-700">
                           <div className="flex items-center gap-2">
                              <span className="text-green-400 font-serif font-bold text-lg">{voiceInputResult.latex_expression}</span>
                              {voiceInputResult.calculated_result && (
                                <>
                                  <span className="text-neutral-500">=</span>
                                  <span className="bg-green-500 text-black px-2 py-0.5 rounded font-bold">{voiceInputResult.calculated_result}</span>
                                </>
                              )}
                           </div>
                           <p className="text-xs text-neutral-400 mt-1">{voiceInputResult.feedback}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-neutral-50 px-4 py-2 rounded-t-xl border-b border-neutral-100 flex justify-between items-center mt-1">
                       <span className="text-xs font-semibold text-neutral-500 uppercase">Lời giải của bạn</span>
                       <span className="text-xs text-neutral-400 italic">Hỗ trợ nhập liệu cơ bản</span>
                    </div>
                    
                    <textarea
                      value={studentAnswer}
                      onChange={(e) => setStudentAnswer(e.target.value)}
                      placeholder="Nhập lời giải hoặc sử dụng giọng nói..."
                      className="w-full h-full flex-1 p-6 resize-none focus:outline-none text-base text-neutral-800 font-serif leading-relaxed"
                      disabled={isGrading}
                    />
                    
                    {/* Action Bar */}
                    <div className="p-4 border-t border-neutral-100 bg-white rounded-b-xl flex justify-between items-center">
                       <VoiceInput 
                         onResult={handleVoiceInputResult} 
                         onProcessingStart={() => setVoiceInputResult(null)}
                         disabled={isGrading}
                       />

                       <button
                         onClick={handleSubmit}
                         disabled={!studentAnswer.trim() || isGrading}
                         className={`
                           px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 h-12
                           ${!studentAnswer.trim() || isGrading 
                             ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none' 
                             : 'bg-neutral-900 text-white hover:bg-neutral-800 hover:shadow-xl'}
                         `}
                       >
                         {isGrading ? 'AI Đang chấm...' : 'Nộp bài'}
                       </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col h-full p-6">
                    <div className="flex-1 flex flex-col justify-center">
                      <VoiceSubmission 
                        onAudioReady={setVoiceBlob}
                        disabled={isGrading}
                      />
                    </div>
                    <div className="mt-6 flex justify-end">
                       <button
                         onClick={handleSubmit}
                         disabled={!voiceBlob || isGrading}
                         className={`
                           w-full px-8 py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 text-lg
                           ${!voiceBlob || isGrading 
                             ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none' 
                             : 'bg-neutral-900 text-white hover:bg-neutral-800 hover:shadow-xl'}
                         `}
                       >
                         {isGrading ? (
                           <span className="flex items-center justify-center gap-2">
                             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             Đang xử lý giọng nói...
                           </span>
                         ) : 'Nộp bài ghi âm'}
                       </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Area (Text) */}
            {gradingResult && (
              <GradingFeedback 
                result={gradingResult}
                onNext={handleNextQuestion}
                onRetry={() => setGradingResult(null)}
              />
            )}

            {/* Feedback Area (Voice) */}
            {voiceSubmissionResult && (
              <VoiceResultView 
                result={voiceSubmissionResult}
                onNext={handleNextQuestion}
                onRetry={() => {
                  setVoiceSubmissionResult(null);
                  setVoiceBlob(null);
                }}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentPracticeView;