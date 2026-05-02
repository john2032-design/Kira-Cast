'use client';

import ErrorState from '@/components/ErrorState';

export default function WatchError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="pt-28 pb-20 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto">
      <ErrorState title="Failed to load watch page" message="Please retry in a moment." onRetry={reset} />
    </div>
  );
}
