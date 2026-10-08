import { cn } from '@/utils/lib'
import { LoadingRegion, Skeleton as Base } from '@/components/ui/skeleton'

/**
 * What a dashboard page looks like while its data loads: a title, a row of
 * cards and a list. Shown by each area's loading.tsx the moment a link is
 * clicked, so navigation never feels frozen. It appears after a short delay
 * (fast pages never flash it) and holds still under reduced motion.
 */
export function PageSkeleton({ cards = 3, rows = 5, compact = false }: { cards?: number; rows?: number; compact?: boolean }) {
    return (
        <LoadingRegion label="Loading page" className="animate-in fade-in-0 fill-mode-both [animation-delay:150ms] duration-300 motion-reduce:animate-none">
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
