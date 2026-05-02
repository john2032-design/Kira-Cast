type LoadingSkeletonVariant = 'row' | 'grid' | 'detail' | 'watch';

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-800/80 ${className}`} />;
}

export default function LoadingSkeleton({
  variant = 'grid',
  count = 8,
}: {
  variant?: LoadingSkeletonVariant;
  count?: number;
}) {
  if (variant === 'row') {
    return (
      <div className="mb-10 px-4 md:px-8 lg:px-12">
        <Block className="mb-4 h-8 w-56" />
        <div className="flex gap-2 md:gap-4 overflow-hidden py-4">
          {Array.from({ length: Math.max(5, count) }).map((_, index) => (
            <div key={index} className="flex-none w-[160px] sm:w-[200px] md:w-[240px]">
              <Block className="aspect-[2/3] w-full" />
              <Block className="mt-2 h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="pb-20">
        <Block className="h-[60vh] w-full rounded-none" />
        <div className="px-4 md:px-8 lg:px-12 mt-10 space-y-4">
          <Block className="h-10 w-80" />
          <Block className="h-6 w-64" />
          <Block className="h-5 w-full max-w-4xl" />
          <Block className="h-5 w-full max-w-3xl" />
        </div>
      </div>
    );
  }

  if (variant === 'watch') {
    return (
      <div className="min-h-screen bg-black text-white pt-20 px-4 pb-12">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[75%] space-y-4">
            <Block className="aspect-video w-full" />
            <Block className="h-40 w-full" />
          </div>
          <div className="w-full lg:w-[25%]">
            <Block className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-10 md:gap-x-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex justify-center">
          <div className="w-full">
            <Block className="aspect-[2/3] w-full" />
            <Block className="mt-2 h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
