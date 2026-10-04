export interface SkeletonProps {
  className?: string;
}

/** A single shimmering placeholder block. Size it with Tailwind classes. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden className={"skeleton rounded-xl " + className} />;
}

/** Card-shaped loading placeholder (title, two lines, meter). */
export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={
        "rounded-3xl border border-paper-200/60 bg-white/[0.02] p-7 " + className
      }
    >
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-5 h-5 w-2/3" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <Skeleton className="mt-8 h-1 w-full" />
    </div>
  );
}
