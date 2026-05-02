import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="pt-28 pb-20 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <LoadingSkeleton variant="row" count={8} />
      </div>
    </div>
  );
}
