'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { Section } from '@/lib/types';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: File;
  section: Section;
}

export default function PDFViewer({ file, section }: PDFViewerProps) {
  const [containerWidth, setContainerWidth] = useState<number>(700);

  const pageNumbers = Array.from(
    { length: section.endPage - section.startPage + 1 },
    (_, i) => section.startPage + i
  );

  return (
    <div
      className="flex-1 overflow-y-auto bg-gray-100 flex flex-col items-center py-6 gap-4"
      ref={(el) => {
        if (el) setContainerWidth(Math.min(el.clientWidth - 48, 900));
      }}
    >
      <Document
        file={file}
        loading={
          <div className="text-gray-400 text-sm mt-8">Loading PDF...</div>
        }
        error={
          <div className="text-red-500 text-sm mt-8">Failed to load PDF.</div>
        }
      >
        {pageNumbers.map((pageNum) => (
          <div key={pageNum} className="shadow-md mb-2">
            <Page
              pageNumber={pageNum}
              width={containerWidth}
              renderTextLayer={true}
              renderAnnotationLayer={false}
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
