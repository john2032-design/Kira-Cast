'use client';

import { RefreshCcw, AlertTriangle } from 'lucide-react';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this content right now. Please try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-16 px-4 border border-red-900/50 bg-red-950/20 rounded-lg">
      <AlertTriangle className="w-14 h-14 mx-auto mb-4 text-red-400" />
      <h2 className="text-2xl font-bold mb-2 text-white">{title}</h2>
      <p className="text-gray-300 max-w-2xl mx-auto">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 bg-white text-black px-5 py-2 rounded font-semibold hover:bg-gray-200 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}
