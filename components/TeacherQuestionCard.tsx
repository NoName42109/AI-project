import React, { useState } from 'react';
import { ProcessedQuestion, VietProblemType, DifficultyLevel } from '../types';

interface TeacherQuestionCardProps {
  question: ProcessedQuestion;
  index: number;
  onUpdate: (id: string, updatedData: Partial<ProcessedQuestion>) => void;
  onDelete: (id: string) => void;
}

const TeacherQuestionCard: React.FC<TeacherQuestionCardProps> = ({ question, index, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    cleaned_content: question.cleaned_content,
    sub_topic: question.sub_topic,
    difficulty_level: question.difficulty_level,
    detected_equation: question.detected_equation || ''
  });

  const handleSave = () => {
    onUpdate(question.id, {
      ...editedData,
      // Simple logic: if topic is Valid and text is not empty, mark as valid
      is_valid_viet: editedData.sub_topic !== VietProblemType.INVALID && editedData.cleaned_content.length > 5
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData({
      cleaned_content: question.cleaned_content,
      sub_topic: question.sub_topic,
      difficulty_level: question.difficulty_level,
      detected_equation: question.detected_equation || ''
    });
    setIsEditing(false);
  };

  const isInvalid = !question.is_valid_viet;

  return (
    <div className={`
      relative rounded-lg border transition-all duration-200
      ${isEditing ? 'bg-white ring-2 ring-primary-500 border-transparent shadow-lg z-10' : 'bg-white border-neutral-200 hover:border-neutral-300'}
      ${isInvalid && !isEditing ? 'bg-neutral-50 border-neutral-200' : ''}
    `}>
      
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50/50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-6 h-6 rounded bg-neutral-200 text-neutral-600 text-xs font-bold font-mono">
            #{index + 1}
          </span>
          {isInvalid && !isEditing && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase rounded">
              Cần kiểm tra
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="Chỉnh sửa"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button 
                onClick={() => onDelete(question.id)}
                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Xóa"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <>
               <button 
                 onClick={handleCancel}
                 className="text-xs font-medium text-neutral-500 hover:text-neutral-800 px-3 py-1"
               >
                 Hủy
               </button>
               <button 
                 onClick={handleSave}
                 className="text-xs font-medium bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 shadow-sm"
               >
                 Lưu
               </button>
            </>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5">
        {isEditing ? (
          <div className="space-y-4">
            {/* Editing: Content */}
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Nội dung câu hỏi</label>
              <textarea 
                value={editedData.cleaned_content}
                onChange={(e) => setEditedData({...editedData, cleaned_content: e.target.value})}
                className="w-full text-sm p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[120px] font-serif"
              />
            </div>

            {/* Editing: Equation */}
            <div>
               <label className="block text-xs font-semibold text-neutral-500 mb-1">Phương trình detected</label>
               <input 
                 type="text"
                 value={editedData.detected_equation}
                 onChange={(e) => setEditedData({...editedData, detected_equation: e.target.value})}
                 className="w-full text-sm p-2 border border-neutral-300 rounded-lg font-mono text-primary-700 bg-neutral-50"
               />
            </div>

            {/* Editing: Metadata Row */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Dạng bài</label>
                  <select 
                    value={editedData.sub_topic}
                    onChange={(e) => setEditedData({...editedData, sub_topic: e.target.value})}
                    className="w-full text-sm p-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    {Object.values(VietProblemType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Độ khó</label>
                  <select 
                    value={editedData.difficulty_level}
                    onChange={(e) => setEditedData({...editedData, difficulty_level: e.target.value as DifficultyLevel})}
                    className="w-full text-sm p-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                    <option value="EXPERT">EXPERT</option>
                  </select>
               </div>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="flex gap-4">
             <div className="flex-1">
                <div className="math-content text-neutral-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">
                   {question.cleaned_content}
                </div>
                {question.detected_equation && (
                  <code className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded border border-neutral-200 font-mono inline-block">
                    {question.detected_equation}
                  </code>
                )}
             </div>

             {/* Side Metadata */}
             <div className="w-32 flex flex-col gap-2 shrink-0 border-l border-neutral-100 pl-4">
                <div>
                   <span className="block text-[10px] text-neutral-400 font-bold uppercase">Dạng bài</span>
                   <span className="text-xs font-medium text-primary-700">{question.sub_topic}</span>
                </div>
                <div>
                   <span className="block text-[10px] text-neutral-400 font-bold uppercase">Độ khó</span>
                   <span className={`text-xs font-bold ${
                      question.difficulty_level === 'HARD' || question.difficulty_level === 'EXPERT' 
                      ? 'text-orange-600' 
                      : 'text-teal-600'
                   }`}>
                      {question.difficulty_level}
                   </span>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherQuestionCard;