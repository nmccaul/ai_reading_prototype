'use client';

import { useRef, useState } from 'react';
import { float32ToPcm16, arrayBufferToBase64 } from '@/lib/audio-utils';
import type { RealtimeClient } from '@/lib/realtime-client';

interface VoiceRecorderProps {
  realtimeClient: RealtimeClient | null;
  disabled: boolean;
}

export default function VoiceRecorder({ realtimeClient, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    if (!realtimeClient || disabled) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = ctx;

      await ctx.audioWorklet.addModule('/audio-processor.js');

      const source = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, 'pcm-processor');
      workletNodeRef.current = worklet;

      worklet.port.onmessage = (e: MessageEvent<Float32Array>) => {
        const pcm = float32ToPcm16(e.data);
        const b64 = arrayBufferToBase64(pcm);
        realtimeClient.sendAudioChunk(b64);
      };

      source.connect(worklet);
      setIsRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(msg);
    }
  };

  const stopRecording = () => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        disabled={disabled || !realtimeClient}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? 'bg-red-500 scale-110 shadow-lg shadow-red-200'
            : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300'
        }`}
        title="Hold to speak"
      >
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </button>
      <p className="text-xs text-gray-400">
        {isRecording ? 'Listening...' : 'Hold to speak'}
      </p>
      {error && <p className="text-xs text-red-500 text-center max-w-xs">{error}</p>}
    </div>
  );
}
