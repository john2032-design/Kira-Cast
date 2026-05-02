'use client';

import ErrorState from '@/components/ErrorState';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-riko-dark text-white">
        <main className="pt-28 pb-20 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto">
          <ErrorState title="Application error" message={error.message || 'Unexpected error occurred.'} onRetry={reset} />
        </main>
      </body>
    </html>
  );
}
