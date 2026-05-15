'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/types';
import type { RealtimeClient } from '@/lib/realtime-client';
import VoiceRecorder from './VoiceRecorder';

interface ChatPanelProps {
  messages: ChatMessage[];
  realtimeClient: RealtimeClient | null;
  isConnecting: boolean;
  isUnlocked: boolean;
  mode: 'text' | 'voice';
  onModeToggle: () => void;
}

export default function ChatPanel({
  messages,
  realtimeClient,
  isConnecting,
  isUnlocked,
  mode,
  onModeToggle,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !realtimeClient) return;
    realtimeClient.sendTextMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${realtimeClient?.isConnected ? 'bg-green-400' : 'bg-gray-300'}`} />
          <span className="text-sm font-medium text-gray-700">AI Tutor</span>
        </div>
        <button
          onClick={onModeToggle}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
          title={`Switch to ${mode === 'text' ? 'voice' : 'text'} mode`}
        >
          {mode === 'text' ? (
            <>
              <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              Voice
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
              Text
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isConnecting && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            Connecting to AI tutor...
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isUnlocked && (
          <div className="text-center text-xs text-green-600 font-medium py-2">
            Section unlocked! Continue when ready.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        {mode === 'text' ? (
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your thoughts..."
              disabled={!realtimeClient?.isConnected}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !realtimeClient?.isConnected}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <VoiceRecorder
              realtimeClient={realtimeClient}
              disabled={!realtimeClient?.isConnected}
            />
          </div>
        )}
        <p className="text-xs text-gray-400 text-center mt-2">
          {mode === 'text' ? 'Press Enter to send' : 'Hold the button to speak'}
        </p>
      </div>
    </div>
  );
}
