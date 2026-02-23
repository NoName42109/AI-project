import React, { useState, useRef, useEffect } from 'react';
import { voiceMathService } from '../services/voiceMathService';
import { VoiceMathResult } from '../types';

interface VoiceInputProps {
  onResult: (result: VoiceMathResult) => void;
  onProcessingStart: () => void;
  disabled?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onResult, onProcessingStart, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      drawVisualizer();

      // Setup Recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop Visualizer
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        
        // Stop Stream Tracks
        stream.getTracks().forEach(track => track.stop());

        // Process
        setIsProcessing(true);
        onProcessingStart();
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Chrome/FF default
        try {
          const result = await voiceMathService.analyzeAudioMath(blob);
          onResult(result);
        } catch (error) {
          console.error(error);
          alert("Không thể xử lý giọng nói. Vui lòng thử lại.");
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Vui lòng cấp quyền truy cập microphone để sử dụng tính năng này.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      if (analyserRef.current) {
         analyserRef.current.getByteFrequencyData(dataArray);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw simple bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for(let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 200)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isProcessing}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 scale-110 ring-4 ring-red-200' 
              : 'bg-primary-600 hover:bg-primary-700 text-white'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
           {isProcessing ? (
             <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
           ) : isRecording ? (
             <div className="w-6 h-6 bg-white rounded-md"></div> // Stop Icon
           ) : (
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
           )}
        </button>
        
        {/* Visualizer Canvas overlay or below */}
        {isRecording && (
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
             {/* Simple pulse effect if canvas fails or for decoration */}
             <div className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping"></div>
          </div>
        )}
      </div>

      {isRecording && (
        <canvas ref={canvasRef} width={120} height={40} className="w-32 h-10" />
      )}
      
      <span className="text-xs font-medium text-neutral-500">
        {isRecording ? "Đang nghe..." : isProcessing ? "Đang tính toán..." : "Trả lời bằng giọng nói"}
      </span>
    </div>
  );
};

export default VoiceInput;