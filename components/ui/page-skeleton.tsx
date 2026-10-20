import { cn } from '@/utils/lib'
import { LoadingRegion, Skeleton as Base } from '@/components/ui/skeleton'

/**
 * What a dashboard page looks like while its data loads: a title, a row of
 * cards and a list. Shown by each area's loading.tsx the moment a link is
 * clicked, so navigation never feels frozen. It appears after a short delay
 * (fast pages never flash it) and holds still under reduced motion.
 */
// Appears after a short delay (fast pages never flash it), then fades in.
const reveal = 'animate-in fade-in-0 fill-mode-both [animation-delay:150ms] duration-300 motion-reduce:animate-none'

export function PageSkeleton({ cards = 3, rows = 5, compact = false }: { cards?: number; rows?: number; compact?: boolean }) {
    return (
        <LoadingRegion label="Loading page" className={reveal}>
            <div className={cn('space-y-6', !compact && 'md:space-y-8')}>
                <div className="space-y-2.5">
                    <Skeleton className={cn('h-8 w-56 max-w-full rounded-control', !compact && 'sm:h-9 sm:w-72')} />
                    <Skeleton className="h-4 w-80 max-w-full" />
                </div>

                <div className={cn('grid gap-4', cards >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3')}>
                    {Array.from({ length: cards }, (_, i) => (
                        <div key={i} className={cn('rounded-card bg-card shadow-border', compact ? 'p-4' : 'p-5')}>
                            <Skeleton className="size-9 rounded-full" />
                            <Skeleton className="mt-4 h-6 w-16" />
                            <Skeleton className="mt-2 h-4 w-3/4" />
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden rounded-card bg-card shadow-border">
                    <div className="border-b border-border px-5 py-4">
                        <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="divide-y divide-border">
                        {Array.from({ length: rows }, (_, i) => (
                            <div key={i} className={cn('flex items-center gap-3 px-5', compact ? 'py-3' : 'py-4')}>
                                <Skeleton className="size-8 shrink-0 rounded-full" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton className="h-4 w-2/5" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                                <Skeleton className="hidden h-8 w-24 rounded-full sm:block" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </LoadingRegion>
    )
}

// A touch stronger than the default muted fill so the shapes read on the
// page background as well as inside cards.
function Skeleton({ className }: { className?: string }) {
    return <Base className={cn('bg-foreground/[0.07]', className)} />
}

/** Page title and subtitle, sized like the pages' own headers. */
function HeaderSkeleton() {
    return (
        <div className="space-y-2.5">
            <Skeleton className="h-9 w-56 max-w-full rounded-control sm:h-10 sm:w-72" />
            <Skeleton className="h-5 w-80 max-w-full" />
        </div>
    )
}

/**
 * Sessions pages: header, the pill tabs and a list of session cards. The
 * student page also has the journey bar above the tabs.
 */
export function SessionsSkeleton({ journey = false }: { journey?: boolean }) {
    return (
        <LoadingRegion label="Loading sessions" className={reveal}>
            <div className="mx-auto max-w-4xl space-y-6">
                <HeaderSkeleton />

                {journey && (
                    <div className="rounded-card bg-card p-5 shadow-border sm:p-6">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
                        <div className="mt-6 flex justify-between gap-2">
                            {Array.from({ length: 4 }, (_, i) => (
                                <div key={i} className="flex flex-1 flex-col items-center gap-2.5">
                                    <Skeleton className="size-9 rounded-full" />
                                    <Skeleton className="h-3.5 w-16 max-w-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Skeleton className="h-11 w-full rounded-full sm:w-96" />

                <div className="grid gap-4">
                    {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className="flex flex-col gap-4 rounded-card bg-card p-6 shadow-border md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="size-12 shrink-0 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-48 max-w-full" />
                                    <Skeleton className="h-4 w-36" />
                                </div>
                            </div>
                            <Skeleton className="h-11 w-36 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </LoadingRegion>
    )
}

/**
 * Messages: the same full-bleed frame as the page, a conversation list and,
 * from tablet width, an open thread beside it.
 */
export function MessagesSkeleton() {
    return (
        <LoadingRegion label="Loading messages" className={cn(reveal, '-mx-4 -mt-4 flex h-[calc(100dvh-160px)] flex-col md:-mx-10 md:-mt-10 md:-mb-10 md:h-screen')}>
            <div className="shrink-0 px-4 pt-4 pb-4 md:px-10 md:pt-5">
                <Skeleton className="h-8 w-40 rounded-control sm:h-9" />
            </div>
            <div className="flex min-h-0 flex-1 overflow-hidden border-t border-border bg-card">
                <div className="flex w-full shrink-0 flex-col border-border md:w-80 md:border-r">
                    <div className="border-b border-border px-4 py-3">
                        <Skeleton className="h-5 w-28" />
                    </div>
                    <div className="divide-y divide-border">
                        {Array.from({ length: 6 }, (_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                                <Skeleton className="size-10 shrink-0 rounded-full" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton className="h-4 w-2/5" />
                                    <Skeleton className="h-3 w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="hidden min-w-0 flex-1 flex-col md:flex">
                    <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                        <Skeleton className="size-9 rounded-full" />
                        <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="flex-1 space-y-4 p-6">
                        <Skeleton className="h-14 w-2/5 rounded-card" />
                        <Skeleton className="ms-auto h-10 w-1/3 rounded-card" />
                        <Skeleton className="h-20 w-1/2 rounded-card" />
                        <Skeleton className="ms-auto h-10 w-1/4 rounded-card" />
                    </div>
                    <div className="border-t border-border p-4">
                        <Skeleton className="h-11 w-full rounded-control" />
                    </div>
                </div>
            </div>
        </LoadingRegion>
    )
}

/** Availability: header, then the week card with its day strip and the day's list. */
export function CalendarSkeleton() {
    return (
        <LoadingRegion label="Loading availability" className={reveal}>
            <div className="mx-auto max-w-4xl">
                <div className="mb-10">
                    <HeaderSkeleton />
                </div>
                <div className="overflow-hidden rounded-card bg-card shadow-border">
                    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-44" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                        <div className="flex gap-1">
                            <Skeleton className="size-9 rounded-full" />
                            <Skeleton className="size-9 rounded-full" />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
                        <div className="grid grid-cols-7 gap-1 px-3 pb-4 sm:px-6 md:pb-6">
                            {Array.from({ length: 7 }, (_, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 py-1">
                                    <Skeleton className="h-3 w-6" />
                                    <Skeleton className="size-9 rounded-full" />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3 border-t border-border p-5 sm:p-6 md:border-t-0 md:border-s md:pt-0">
                            <Skeleton className="h-5 w-40" />
                            {Array.from({ length: 2 }, (_, i) => (
                                <div key={i} className="flex items-center gap-3.5 rounded-card border border-border p-4">
                                    <Skeleton className="size-10 shrink-0 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </LoadingRegion>
    )
}
