'use client';

interface GateBannerProps {
  onOpenChat: () => void;
  unlockReason: string | null;
  onContinue: () => void;
  isLastSection: boolean;
}

export default function GateBanner({ onOpenChat, unlockReason, onContinue, isLastSection }: GateBannerProps) {
  if (unlockReason) {
    return (
      <div className="border-t border-green-200 bg-green-50 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">Great engagement!</p>
          <p className="text-sm text-green-700">{unlockReason}</p>
        </div>
        <button
          onClick={onContinue}
          className="ml-4 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
        >
          {isLastSection ? 'Finish Reading' : 'Next Section →'}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
      <p className="text-sm text-gray-600">
        Chat with the AI tutor to unlock the next section
      </p>
      <button
        onClick={onOpenChat}
        className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        Open Chat
      </button>
    </div>
  );
}
