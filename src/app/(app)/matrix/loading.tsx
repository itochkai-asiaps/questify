import { Skeleton } from "@/components/ui/skeleton";

export default function MatrixLoading() {
  return (
    <div className="container mx-auto p-6">
      <Skeleton className="mb-6 h-8 w-32" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
