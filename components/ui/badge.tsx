import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/lib'

/**
 * Badges and status pills. One palette for every status in the portal, so
 * the same word is the same colour on every page:
 *   scheduled / upcoming / pending review  > blue
 *   completed / approved / paid / active   > green
 *   pending / needs attention / draft      > amber
 *   cancelled / missed / failed / rejected > rose
 *   anything neutral                       > neutral
 * Subjects and categories use the violet and blue tints.
 */
const badgeVariants = cva(
    'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0',
    {
        variants: {
            tone: {
                neutral: 'bg-muted text-secondary-foreground',
                blue: 'bg-tint-blue text-tint-blue-foreground',
                violet: 'bg-tint-violet text-tint-violet-foreground',
                amber: 'bg-tint-amber text-tint-amber-foreground',
                green: 'bg-tint-green text-tint-green-foreground',
                rose: 'bg-tint-rose text-tint-rose-foreground',
                solid: 'bg-primary text-primary-foreground',
                outline: 'border border-border bg-card text-foreground',
            },
            size: {
                default: '',
                lg: 'px-3 py-1 text-sm [&_svg]:size-4',
            },
        },
        defaultVariants: { tone: 'neutral', size: 'default' },
    },
)

function Badge({ className, tone, size, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
    return <span data-slot="badge" className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

/** A small count bubble for nav items and tabs ("3", "9+"), or a dot when count is omitted. */
function CountBadge({ count, className }: { count?: number; className?: string }) {
    if (count === undefined) {
        return <span aria-hidden="true" className={cn('size-2 rounded-full bg-destructive', className)} />
    }
    return (
        <span
            className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold tabular-nums text-white',
                className,
            )}
        >
            {count > 9 ? '9+' : count}
        </span>
    )
}

export { Badge, CountBadge, badgeVariants }
