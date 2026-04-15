import { Skeleton } from "@/components/ui/skeleton";

export default function VaultLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg bg-neutral-900" />
          <Skeleton className="h-4 w-72 rounded-lg bg-neutral-900" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg bg-neutral-900" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-xl bg-neutral-900" />
        <Skeleton className="h-32 rounded-xl bg-neutral-900" />
        <Skeleton className="h-32 rounded-xl bg-neutral-900" />
      </div>
      <Skeleton className="h-64 rounded-xl bg-neutral-900" />
    </div>
  );
}
