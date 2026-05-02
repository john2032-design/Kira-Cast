import { SearchX } from 'lucide-react';

export default function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="text-center py-20 text-gray-400">
      <SearchX className="w-16 h-16 mx-auto mb-4 opacity-20" />
      <h2 className="text-2xl font-bold mb-2 text-white">{title}</h2>
      <p>{message}</p>
    </div>
  );
}
