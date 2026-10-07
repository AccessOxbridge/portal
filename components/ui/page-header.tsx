import * as React from 'react'
import { cn } from '@/utils/lib'

/** Page title, an optional one-line description, and actions on the right (stacked on phones). */
function PageHeader({
    title,
    description,
    actions,
    eyebrow,
    className,
}: {
    title: React.ReactNode
    description?: React.ReactNode
    actions?: React.ReactNode
    eyebrow?: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
            <div className="min-w-0">
                {eyebrow && <p className="mb-1 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
                <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance in-data-[density=compact]:text-xl">{title}</h1>
                {description && <p className="mt-1.5 max-w-2xl text-base text-muted-foreground text-pretty in-data-[density=compact]:text-sm">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}

export { PageHeader }
