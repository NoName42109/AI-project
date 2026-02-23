import React, { useState, useRef } from 'react';

interface VoiceSubmissionProps {
  onAudioReady: (blob: Blob | null) => void;
  disabled?: boolean;
}

const VoiceSubmission: React.FC<VoiceSubmissionProps> = ({ onAudioReady, disabled }) => {
  const [mode, setMode] = useState<'RECORD' | 'UPLOAD'>('RECORD');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onAudioReady(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone error:", err);
      alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioUrl(null);
    onAudioReady(null);
    setRecordingDuration(0);
  };

  // --- UPLOAD LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/webm', 'audio/mp4'];
    if (!validTypes.includes(file.type)) {
      alert("Định dạng file không hỗ trợ. Vui lòng dùng mp3, wav, m4a.");
      return;
    }

    // Validate size (e.g., 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File quá lớn. Vui lòng upload file dưới 10MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    onAudioReady(file);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
      <div className="flex gap-4 mb-4 border-b border-neutral-200 pb-2">
        <button 
          onClick={() => setMode('RECORD')}
          className={`text-sm font-semibold pb-2 -mb-2.5 transition-colors ${mode === 'RECORD' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-neutral-500'}`}
        >
          Ghi âm trực tiếp
        </button>
        <button 
          onClick={() => setMode('UPLOAD')}
          className={`text-sm font-semibold pb-2 -mb-2.5 transition-colors ${mode === 'UPLOAD' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-neutral-500'}`}
        >
          Upload file
        </button>
      </div>

      {mode === 'RECORD' ? (
        <div className="flex flex-col items-center gap-4 py-4">
          {!audioUrl ? (
            <>
              <div className="relative">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={disabled}
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md
                    ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-primary-600 hover:bg-primary-700'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isRecording ? (
                    <div className="w-6 h-6 bg-white rounded-sm" />
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-sm font-medium text-neutral-600">
                {isRecording ? `Đang ghi âm: ${formatTime(recordingDuration)}` : 'Nhấn để bắt đầu ghi âm'}
              </p>
            </>
          ) : (
            <div className="w-full flex flex-col items-center gap-3">
              <audio src={audioUrl} controls className="w-full h-10" />
              <button 
                onClick={resetRecording}
                className="text-xs text-red-500 hover:underline font-medium"
              >
                Xóa & Ghi âm lại
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            className="hidden" 
          />
          
          {!audioUrl ? (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 rounded-xl w-full py-8 flex flex-col items-center gap-2 hover:bg-neutral-100 transition-colors"
            >
              <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-neutral-500 font-medium">Chọn file ghi âm (mp3, wav, m4a)</span>
            </button>
          ) : (
            <div className="w-full flex flex-col items-center gap-3">
               <div className="flex items-center gap-2 w-full bg-white p-3 rounded-lg border border-neutral-200">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                  </div>
                  <span className="text-sm text-neutral-700 truncate flex-1">File đã chọn</span>
                  <button onClick={() => { setAudioUrl(null); onAudioReady(null); }} className="text-neutral-400 hover:text-red-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               <audio src={audioUrl} controls className="w-full h-8" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceSubmission;
