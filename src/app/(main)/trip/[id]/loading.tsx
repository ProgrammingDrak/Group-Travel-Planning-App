import { Skeleton } from "@/components/ui/skeleton";

export default function TripLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 w-full border-b bg-background h-14 flex items-center px-4">
        <Skeleton className="h-5 w-32" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <div className="container py-4 space-y-4">
        {/* Trip info bar */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-32" />
          <div className="ml-auto flex gap-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-full" />
            ))}
          </div>
        </div>

        {/* Tab bar skeleton */}
        <Skeleton className="h-10 w-full max-w-lg" />

        {/* Content skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((day) => (
            <div key={day} className="space-y-2">
              <Skeleton className="h-8 w-64" />
              {[1, 2].map((card) => (
                <Skeleton key={card} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
