import * as React from 'react'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/utils/lib'

/**
 * An invitation, not an apology: a duotone icon, a title naming the space,
 * one sentence, and (only if the page already has one) its action.
 */
function EmptyState({
    icon: IconComponent,
    title,
    description,
    action,
    className,
}: {
    icon?: Icon
    title: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
            {IconComponent && (
                <div className="mb-4 grid size-14 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                    <IconComponent weight="duotone" className="size-7" />
                </div>
            )}
            <p className="text-base font-semibold text-foreground text-balance">{title}</p>
            {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    )
}

export { EmptyState }
