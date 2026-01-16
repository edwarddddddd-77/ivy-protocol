import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

// Stats card skeleton (for Home page dashboard cards)
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden backdrop-blur-md border p-4 w-full md:w-64 bg-slate-900/40 border-white/10",
        className
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <Skeleton className="h-3 w-20 bg-slate-700" />
        <Skeleton className="h-4 w-4 rounded bg-slate-700" />
      </div>
      <Skeleton className="h-8 w-24 bg-slate-700 mb-2" />
      <div className="flex items-center gap-1">
        <Skeleton className="h-1.5 w-1.5 rounded-full bg-slate-700" />
        <Skeleton className="h-3 w-16 bg-slate-700" />
      </div>
    </div>
  );
}

// Glass panel skeleton (for main content panels)
export function PanelSkeleton({ className, rows = 4 }: { className?: string; rows?: number }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-lg bg-slate-700" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 bg-slate-700" />
          <Skeleton className="h-3 w-48 bg-slate-700" />
        </div>
      </div>

      {/* Content rows */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-4 w-24 bg-slate-700" />
            <Skeleton className="h-4 w-20 bg-slate-700" />
          </div>
        ))}
      </div>

      {/* Button */}
      <Skeleton className="h-10 w-full mt-6 bg-slate-700 rounded-lg" />
    </div>
  );
}

// Table skeleton (for lists like Team, DAO proposals)
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-white/10">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 bg-slate-700" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-white/5 last:border-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1 bg-slate-700" />
          ))}
        </div>
      ))}
    </div>
  );
}

// NFT card skeleton (for Market page)
export function NFTCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-4">
      {/* Image placeholder */}
      <Skeleton className="h-40 w-full rounded-lg bg-slate-700 mb-4" />

      {/* Title */}
      <Skeleton className="h-5 w-32 bg-slate-700 mb-2" />

      {/* Details */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-4 w-20 bg-slate-700" />
        <Skeleton className="h-4 w-16 bg-slate-700" />
      </div>

      {/* Button */}
      <Skeleton className="h-9 w-full bg-slate-700 rounded-lg" />
    </div>
  );
}

// Proposal card skeleton (for DAO page)
export function ProposalCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-16 bg-slate-700" />
        <Skeleton className="h-5 w-20 rounded bg-slate-700" />
      </div>

      {/* Title */}
      <Skeleton className="h-6 w-3/4 bg-slate-700 mb-2" />

      {/* Description */}
      <Skeleton className="h-4 w-full bg-slate-700 mb-1" />
      <Skeleton className="h-4 w-2/3 bg-slate-700 mb-4" />

      {/* Progress bar */}
      <Skeleton className="h-2 w-full rounded-full bg-slate-700 mb-4" />

      {/* Footer */}
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24 bg-slate-700" />
        <Skeleton className="h-4 w-16 bg-slate-700" />
      </div>
    </div>
  );
}

// Full page loading skeleton
export function PageSkeleton() {
  return (
    <div className="min-h-screen w-full bg-slate-950 pt-28 px-4 pb-12">
      <div className="container mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="border-b border-white/10 pb-6">
          <Skeleton className="h-4 w-32 bg-slate-700 mb-2" />
          <Skeleton className="h-10 w-64 bg-slate-700 mb-2" />
          <Skeleton className="h-4 w-96 bg-slate-700" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} className="w-full" />
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PanelSkeleton rows={5} />
          <PanelSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}
