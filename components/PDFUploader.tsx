'use client';

import { useRef, useState } from 'react';

interface PDFUploaderProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export default function PDFUploader({ onUpload, isLoading }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }
    onUpload(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {isLoading ? (
        <div className="space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 font-medium">Analyzing your case study...</p>
          <p className="text-sm text-gray-400">GPT-4o is sectioning it into reading checkpoints</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-5xl">📄</div>
          <p className="text-xl font-semibold text-gray-700">Drop your case study PDF here</p>
          <p className="text-sm text-gray-400">or click to browse</p>
        </div>
      )}
    </div>
  );
}
