import React, { useState, useEffect, useRef } from 'react';
import { StudentExam, ExamQuestion, GradingResult } from '../types';
import { examService } from '../services/examService';
import { gradingEngine } from '../services/gradingEngine';
import MathDisplay from './MathDisplay';
import VoiceInput from './VoiceInput';

interface ExamViewProps {
  studentId: string;
  onBack: () => void;
}

type ExamStatus = 'SETUP' | 'LOADING' | 'ACTIVE' | 'SUBMITTING' | 'COMPLETED';

const ExamView: React.FC<ExamViewProps> = ({ studentId, onBack }) => {
  const [status, setStatus] = useState<ExamStatus>('SETUP');
  const [examData, setExamData] = useState<StudentExam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [gradingResults, setGradingResults] = useState<Record<string, GradingResult>>({});
  const [finalScore, setFinalScore] = useState(0);

  // Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'ACTIVE' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const handleStartExam = async (duration: number) => {
    setStatus('LOADING');
    try {
      const session = await examService.startExamSession(studentId, duration);
      setExamData(session);
      setTimeLeft(duration * 60);
      setStatus('ACTIVE');
    } catch (error) {
      console.error("Failed to start exam:", error);
      alert("Không thể bắt đầu bài kiểm tra. Vui lòng thử lại.");
      setStatus('SETUP');
    }
  };

  const handleAnswerChange = (text: string) => {
    if (!examData) return;
    const qId = examData.questions[currentQuestionIndex].id;
    setAnswers(prev => ({ ...prev, [qId]: text }));
  };

  const handleSubmitExam = async () => {
    if (!examData) return;
    setStatus('SUBMITTING');

    // Grade all answers
    const results: Record<string, GradingResult> = {};
    let totalScore = 0;
    let correctCount = 0;

    // Parallel grading could be better, but sequential for simplicity/rate-limits
    for (const q of examData.questions) {
      const studentAns = answers[q.id] || "";
      // In a real app, we'd fetch the solution or have AI grade without it
      const result = await gradingEngine.gradeSubmission(q.content, studentAns);
      results[q.id] = result;
      totalScore += result.score;
      if (result.is_correct) correctCount++;
    }

    const finalAvgScore = totalScore / examData.questions.length;
    setGradingResults(results);
    setFinalScore(finalAvgScore);

    // Save to Firestore
    try {
      await examService.submitExamSession(examData.id, {
        totalScore: finalAvgScore,
        summary: `Đúng ${correctCount}/${examData.questions.length} câu.`,
        details: Object.entries(results).map(([qid, res]) => ({ questionId: qid, ...res }))
      });
    } catch (e) {
      console.error("Error saving exam result", e);
    }

    setStatus('COMPLETED');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- RENDER: SETUP ---
  if (status === 'SETUP') {
    return (
      <div className="flex flex-col h-full bg-surface items-center justify-center p-4 animate-fade-in-up">
        <div className="bg-white p-8 rounded-3xl shadow-card max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Thi thử Vi-ét</h2>
          <p className="text-neutral-500 mb-8">Chọn thời gian làm bài. Hệ thống sẽ tự động tạo đề phù hợp.</p>
          
          <div className="space-y-3">
            {[15, 30, 45].map(min => (
              <button
                key={min}
                onClick={() => handleStartExam(min)}
                className="w-full py-4 px-6 rounded-xl border border-neutral-200 hover:border-primary-500 hover:bg-primary-50 transition-all flex justify-between items-center group"
              >
                <span className="font-bold text-neutral-700 group-hover:text-primary-700">{min} Phút</span>
                <span className="text-sm text-neutral-400 group-hover:text-primary-500">
                  {min === 15 ? '5 câu' : min === 30 ? '8 câu' : '12 câu'}
                </span>
              </button>
            ))}
          </div>

          <button onClick={onBack} className="mt-8 text-neutral-400 hover:text-neutral-600 text-sm font-medium">
            Quay lại Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER: LOADING ---
  if (status === 'LOADING' || status === 'SUBMITTING') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-neutral-500 font-medium">
          {status === 'LOADING' ? 'Đang tạo đề thi...' : 'Đang chấm điểm...'}
        </p>
      </div>
    );
  }

  // --- RENDER: ACTIVE EXAM ---
  if (status === 'ACTIVE' && examData) {
    const currentQ = examData.questions[currentQuestionIndex];
    return (
      <div className="flex flex-col h-full bg-surface">
        {/* Header */}
        <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-neutral-500">Câu {currentQuestionIndex + 1}/{examData.questions.length}</span>
            <div className={`px-3 py-1 rounded-lg font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-700'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          <button 
            onClick={() => {
              if(window.confirm("Nộp bài sớm?")) handleSubmitExam();
            }}
            className="px-4 py-2 bg-neutral-900 text-white text-sm font-bold rounded-lg hover:bg-neutral-800"
          >
            Nộp bài
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Question List Sidebar */}
            <div className="hidden lg:block col-span-1">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
                <div className="grid grid-cols-4 gap-2">
                  {examData.questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-10 w-10 rounded-lg font-bold text-sm transition-all
                        ${idx === currentQuestionIndex ? 'bg-primary-600 text-white shadow-md' : 
                          answers[q.id] ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}
                      `}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Question Area */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-8 shadow-card border border-neutral-100 min-h-[300px]">
                <div className="flex justify-between mb-4">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Đề bài</span>
                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded">{currentQ.difficulty}</span>
                </div>
                <div className="text-lg text-neutral-800 leading-relaxed">
                  <MathDisplay latex={currentQ.content} />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-1 shadow-card border border-neutral-200">
                <textarea
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Nhập câu trả lời của bạn..."
                  className="w-full h-40 p-6 resize-none focus:outline-none text-base text-neutral-800 font-serif"
                />
                <div className="p-4 border-t border-neutral-100 bg-neutral-50 rounded-b-xl flex justify-between items-center">
                   <VoiceInput 
                     onResult={(res) => {
                       if (res.is_correct_syntax) {
                         const val = res.calculated_result ? `${res.latex_expression} = ${res.calculated_result}` : res.latex_expression;
                         handleAnswerChange((answers[currentQ.id] || "") + " " + val);
                       }
                     }}
                   />
                   <div className="flex gap-2">
                     <button
                       disabled={currentQuestionIndex === 0}
                       onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                       className="px-4 py-2 text-neutral-500 hover:bg-neutral-200 rounded-lg disabled:opacity-50"
                     >
                       Trước
                     </button>
                     <button
                       disabled={currentQuestionIndex === examData.questions.length - 1}
                       onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                       className="px-4 py-2 bg-primary-100 text-primary-700 font-bold rounded-lg hover:bg-primary-200 disabled:opacity-50"
                     >
                       Sau
                     </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: COMPLETED ---
  if (status === 'COMPLETED' && examData) {
    return (
      <div className="flex flex-col h-full bg-surface animate-fade-in-up">
        <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-bold text-neutral-800">Kết quả bài thi</h1>
          <button onClick={onBack} className="text-neutral-500 hover:text-neutral-800">Thoát</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Score Card */}
            <div className="bg-neutral-900 text-white rounded-3xl p-8 text-center shadow-xl">
              <p className="text-neutral-400 uppercase tracking-widest text-sm font-bold mb-2">Điểm số của bạn</p>
              <div className="text-6xl font-bold mb-4 text-primary-400">{finalScore.toFixed(1)}<span className="text-2xl text-neutral-500">/10</span></div>
              <p className="text-neutral-300 max-w-md mx-auto">
                {finalScore >= 8 ? "Xuất sắc! Bạn đã nắm vững kiến thức." : finalScore >= 5 ? "Khá tốt, nhưng cần luyện tập thêm." : "Cần cố gắng nhiều hơn nhé!"}
              </p>
            </div>

            {/* Detailed Review */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-neutral-800">Chi tiết bài làm</h3>
              {examData.questions.map((q, idx) => {
                const result = gradingResults[q.id];
                return (
                  <div key={q.id} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-bold text-neutral-500">Câu {idx + 1}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${result?.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {result?.is_correct ? 'ĐÚNG' : 'SAI'} ({result?.score}/10)
                      </span>
                    </div>
                    <div className="mb-4 text-neutral-800">
                      <MathDisplay latex={q.content} />
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-xl mb-4">
                      <p className="text-xs text-neutral-400 uppercase font-bold mb-1">Bài làm của bạn:</p>
                      <p className="font-serif text-neutral-700">{answers[q.id] || "(Không trả lời)"}</p>
                    </div>
                    {result && (
                      <div className={`p-4 rounded-xl ${result.is_correct ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                        <p className="font-bold text-sm mb-1">{result.feedback_short}</p>
                        <p className="text-sm opacity-90">{result.feedback_detailed}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ExamView;
