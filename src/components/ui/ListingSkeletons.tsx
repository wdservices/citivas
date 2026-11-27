import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Matches ListingCard geometry: 192px hero image + title/rating + 2-line description + location + action bar.
 */
export function ListingCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/60">
      <div className="relative h-48 bg-muted/60">
        <Skeleton className="w-full h-full rounded-none" />
        <Skeleton className="absolute top-3 left-3 h-5 w-20 rounded-full bg-background/60" />
        <Skeleton className="absolute bottom-3 left-3 h-5 w-16 rounded-full bg-background/60" />
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-10 shrink-0" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
        <Skeleton className="h-3.5 w-2/3" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-8 flex-1 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading listings">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Matches EventsPage 3-column event card grid.
 */
export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading events">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-border/50 shadow-sm">
          <div className="relative h-48 bg-muted/60">
            <Skeleton className="w-full h-full rounded-none" />
            <Skeleton className="absolute top-3 right-3 h-6 w-20 rounded-full bg-background/60" />
          </div>
          <CardHeader className="pb-3 space-y-2.5">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Matches MarketplacePage grid or list mode.
 */
export function MarketplaceSkeleton({
  viewMode = "grid",
  count = 10,
}: {
  viewMode?: "grid" | "list";
  count?: number;
}) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
          <div key={i} className="bg-card/60 rounded-2xl border border-border/50 p-3 flex gap-4">
            <Skeleton className="w-32 sm:w-44 aspect-[4/3] rounded-xl shrink-0" />
            <div className="flex-1 py-1 space-y-2.5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-5 w-24 mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card/60 rounded-2xl border border-border/50 p-3 space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <div className="space-y-2 px-0.5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Matches CategoriesPage horizontal card row (w-[280px], aspect-[3/2]).
 */
export function CategoryRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="px-4 md:px-6" aria-busy="true" aria-label="Loading category">
      <div className="flex gap-4 overflow-hidden pb-4 -mx-4 px-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[280px] bg-card/60 rounded-xl overflow-hidden border border-border/50"
          >
            <Skeleton className="aspect-[3/2] w-full rounded-none" />
            <div className="p-3.5 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Matches LandingPage MiniSiteCard grid.
 */
export function MiniSiteGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true" aria-label="Loading stays">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="p-5 space-y-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Matches DetailPage hero + two-column details layout.
 */
export function DetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading listing details">
      <div className="border-b border-border/50 px-4 py-4 max-w-7xl mx-auto flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <Skeleton className="w-full h-[300px] md:h-[400px] rounded-none" />
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Matches MarketplaceDetailPage two-column gallery + product details.
 */
export function MarketplaceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading product details">
      <div className="border-b border-border/50 px-4 py-4 max-w-7xl mx-auto flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <div className="flex gap-3">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <Skeleton className="w-20 h-20 rounded-xl" />
            <Skeleton className="w-20 h-20 rounded-xl" />
          </div>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-40" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Matches ProfilePage bookings list.
 */
export function BookingsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading bookings">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-4 flex gap-4">
          <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2.5 py-1">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Matches Admin Dashboard KPI cards, charts & activity feed.
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard metrics">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between">
              <div className="space-y-2.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="card space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-44 w-44 rounded-full mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <div className="card lg:col-span-2 space-y-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-b-0">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Matches Admin Properties / Events 3-column card grid.
 */
export function AdminCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-sand-200 bg-white p-4 space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Matches Admin table rows (Users, Wallet, MiniSites).
 */
export function AdminTableRowsSkeleton({
  cols = 5,
  rows = 6,
  asTable = true,
}: {
  cols?: number;
  rows?: number;
  asTable?: boolean;
}) {
  if (!asTable) {
    return (
      <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading table">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-4 py-3 border-b border-sand-100 last:border-b-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} className={`h-4 ${c === 0 ? "w-4/5" : "w-3/5"}`} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-sand-100 last:border-b-0">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-5 py-3.5">
              <Skeleton className={`h-4 ${c === 0 ? "w-36" : "w-20"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
