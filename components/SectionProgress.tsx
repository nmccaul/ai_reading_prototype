'use client';

import type { Section } from '@/lib/types';

interface SectionProgressProps {
  sections: Section[];
  currentIndex: number;
  unlockedUpTo: number;
}

export default function SectionProgress({ sections, currentIndex, unlockedUpTo }: SectionProgressProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-white border-b border-gray-200 overflow-x-auto">
      {sections.map((section, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLocked = i > unlockedUpTo;

        return (
          <div key={section.id} className="flex items-center gap-1 flex-shrink-0">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isCompleted
                  ? 'bg-green-100 text-green-700'
                  : isCurrent
                  ? 'bg-blue-600 text-white'
                  : isLocked
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isCompleted ? '✓ ' : isCurrent ? '' : isLocked ? '🔒 ' : ''}
              {i + 1}. {section.title}
            </div>
            {i < sections.length - 1 && (
              <div className={`w-4 h-px ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
