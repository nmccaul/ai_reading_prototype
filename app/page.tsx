'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PDFUploader from '@/components/PDFUploader';
import { setPendingFile } from '@/lib/file-store';
import type { SessionStoragePayload } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process PDF');
      }

      const { sections, totalPages } = await res.json();

      const payload: SessionStoragePayload = {
        sections,
        fileName: file.name,
        totalPages,
      };

      sessionStorage.setItem('ai_reading_session', JSON.stringify(payload));
      setPendingFile(file);
      router.push('/read');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Case Study Reader</h1>
          <p className="text-gray-500">
            Upload a PDF case study and engage critically with an AI tutor, section by section.
          </p>
        </div>

        <PDFUploader onUpload={handleUpload} isLoading={isLoading} />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="text-center space-y-1">
          <p className="text-xs text-gray-400">How it works</p>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
            <span>📄 Upload PDF</span>
            <span className="text-gray-300">→</span>
            <span>📖 Read a section</span>
            <span className="text-gray-300">→</span>
            <span>💬 Chat with AI</span>
            <span className="text-gray-300">→</span>
            <span>✓ Unlock next</span>
          </div>
        </div>
      </div>
    </main>
  );
}
