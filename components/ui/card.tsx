import * as React from 'react'
import { cn } from '@/utils/lib'

/**
 * The one surface. Depth comes from a hairline ring plus a soft shadow
 * (shadow-border); `border-transparent` keeps an edge in Windows high-contrast
 * mode, which drops box-shadows (better-ui).
 */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card"
            className={cn('rounded-card border border-transparent bg-card text-card-foreground shadow-border', className)}
            {...props}
        />
    )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-header"
            className={cn(
                'flex items-start justify-between gap-4 px-5 pt-5 in-data-[density=compact]:px-4 in-data-[density=compact]:pt-4',
                className,
            )}
            {...props}
        />
    )
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
    return (
        <h3
            data-slot="card-title"
            className={cn('text-base font-semibold leading-snug text-foreground text-balance', className)}
            {...props}
        />
    )
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
    return <p data-slot="card-description" className={cn('mt-1 text-sm text-muted-foreground text-pretty', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-content"
            className={cn('px-5 py-5 in-data-[density=compact]:px-4 in-data-[density=compact]:py-4', className)}
            {...props}
        />
    )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-footer"
            className={cn('flex items-center gap-2 border-t border-border px-5 py-4 in-data-[density=compact]:px-4 in-data-[density=compact]:py-3', className)}
            {...props}
        />
    )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
