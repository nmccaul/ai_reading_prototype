'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getPendingFile, clearPendingFile } from '@/lib/file-store';
import { RealtimeClient } from '@/lib/realtime-client';
import { playPcm16Chunk } from '@/lib/audio-utils';
import type { ChatMessage, Section, SessionStoragePayload } from '@/lib/types';
import SectionProgress from '@/components/SectionProgress';
import ChatPanel from '@/components/ChatPanel';
import GateBanner from '@/components/GateBanner';

// PDF viewer uses browser APIs; load client-only
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });

export default function ReadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [fileName, setFileName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [unlockedUpTo, setUnlockedUpTo] = useState(-1);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockReason, setUnlockReason] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [mode, setMode] = useState<'text' | 'voice'>('text');

  const realtimeClientRef = useRef<RealtimeClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const appendMessage = useCallback(
    (role: 'user' | 'assistant', content: string, id?: string) => {
      setMessages((prev) => [
        ...prev,
        { id: id ?? Date.now().toString(), role, content, timestamp: Date.now() },
      ]);
    },
    []
  );

  const appendAssistantDelta = useCallback((delta: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
      }
      return [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: delta, timestamp: Date.now() },
      ];
    });
  }, []);

  const handleRealtimeEvent = useCallback(
    (event: { type: string; [key: string]: unknown }) => {
      switch (event.type) {
        // GA: was response.text.delta
        case 'response.output_text.delta': {
          const delta = event.delta as string;
          if (delta) appendAssistantDelta(delta);
          break;
        }

        // GA: was response.audio.delta
        case 'response.output_audio.delta': {
          const audioBase64 = event.delta as string;
          if (audioBase64) {
            if (!audioContextRef.current) {
              audioContextRef.current = new AudioContext({ sampleRate: 24000 });
            }
            playPcm16Chunk(audioBase64, audioContextRef.current);
          }
          break;
        }

        // AI voice transcript (shows what AI said in text form during voice mode)
        case 'response.output_audio_transcript.delta': {
          // Only append if we're not already getting output_text (avoid duplication)
          // output_audio_transcript fires when output_modalities includes audio only;
          // with ["audio","text"] we get output_text.delta instead, so this is a no-op.
          break;
        }

        // User audio transcript after VAD commits their turn
        case 'conversation.item.input_audio_transcription.completed': {
          const transcript = event.transcript as string;
          if (transcript) appendMessage('user', transcript);
          break;
        }

        // GA: function calls are read from response.done → response.output array
        case 'response.done': {
          type OutputItem = { type: string; name?: string; arguments?: string; call_id?: string };
          const output = (event.response as { output?: OutputItem[] })?.output ?? [];
          for (const item of output) {
            if (item.type === 'function_call' && item.name === 'unlock_next_section') {
              try {
                const args = JSON.parse(item.arguments ?? '{}');
                setIsUnlocked(true);
                setUnlockReason(args.reason ?? 'Great work! You can move on.');
                setUnlockedUpTo((prev) => Math.max(prev, currentIndex));

                // Acknowledge the tool call so the model can give verbal confirmation
                realtimeClientRef.current?.send({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: item.call_id,
                    output: JSON.stringify({ success: true }),
                  },
                });
                realtimeClientRef.current?.send({ type: 'response.create' });
              } catch {
                // ignore parse errors
              }
            }
          }
          break;
        }

        case 'error': {
          console.error('Realtime API error:', event);
          break;
        }
      }
    },
    [appendMessage, appendAssistantDelta, currentIndex]
  );

  const startSession = useCallback(
    async (section: Section) => {
      realtimeClientRef.current?.disconnect();
      setIsConnecting(true);

      try {
        const res = await fetch('/api/realtime-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId: section.id,
            sectionTitle: section.title,
            sectionSummary: section.summary,
            thinkingPrompts: section.thinkingPrompts,
          }),
        });

        if (!res.ok) throw new Error('Failed to get session token');
        const { token } = await res.json();

        const client = new RealtimeClient(handleRealtimeEvent);
        await client.connect(token);
        realtimeClientRef.current = client;
      } catch (err) {
        console.error('Session start error:', err);
      } finally {
        setIsConnecting(false);
      }
    },
    [handleRealtimeEvent]
  );

  // Initialize from sessionStorage + file-store on mount
  useEffect(() => {
    const raw = sessionStorage.getItem('ai_reading_session');
    const f = getPendingFile();

    if (!raw || !f) {
      router.replace('/');
      return;
    }

    const payload: SessionStoragePayload = JSON.parse(raw);
    setFile(f);
    setSections(payload.sections);
    setFileName(payload.fileName);
    clearPendingFile();

    if (payload.sections.length > 0) {
      startSession(payload.sections[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= sections.length) {
      // Finished all sections
      sessionStorage.removeItem('ai_reading_session');
      router.push('/');
      return;
    }

    setCurrentIndex(nextIndex);
    setIsUnlocked(false);
    setUnlockReason(null);
    setMessages([]);
    await startSession(sections[nextIndex]);
  };

  if (!file || sections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  const currentSection = sections[currentIndex];
  const isLastSection = currentIndex === sections.length - 1;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Back
        </button>
        <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{fileName}</span>
        <button
          onClick={() => setIsChatOpen((o) => !o)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {isChatOpen ? 'Hide Chat' : 'Show Chat'}
        </button>
      </div>

      {/* Section progress */}
      <SectionProgress
        sections={sections}
        currentIndex={currentIndex}
        unlockedUpTo={unlockedUpTo}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <PDFViewer file={file} section={currentSection} />
          <GateBanner
            onOpenChat={() => setIsChatOpen(true)}
            unlockReason={unlockReason}
            onContinue={handleContinue}
            isLastSection={isLastSection}
          />
        </div>

        {/* Chat sidebar */}
        {isChatOpen && (
          <div className="w-96 flex-shrink-0 border-l border-gray-200 flex flex-col">
            <ChatPanel
              messages={messages}
              realtimeClient={realtimeClientRef.current}
              isConnecting={isConnecting}
              isUnlocked={isUnlocked}
              mode={mode}
              onModeToggle={() => setMode((m) => (m === 'text' ? 'voice' : 'text'))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
