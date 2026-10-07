import * as React from 'react'
import { cn } from '@/utils/lib'

/**
 * Placeholder shaped like the content it stands in for. A slow, quiet pulse;
 * under reduced motion it holds still.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            aria-hidden="true"
            className={cn('animate-pulse rounded-md bg-muted [animation-duration:1.8s] motion-reduce:animate-none', className)}
            {...props}
        />
    )
}

/** Accessible wrapper for a whole loading region: announces once, hides the shapes. */
function LoadingRegion({ label = 'Loading', className, children }: { label?: string; className?: string; children: React.ReactNode }) {
    return (
        <div role="status" aria-live="polite" className={className}>
            <span className="sr-only">{label}</span>
            {children}
        </div>
    )
}

export { Skeleton, LoadingRegion }
