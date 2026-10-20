import * as React from 'react'
import { cn } from '@/utils/lib'

/**
 * Text field. Always 16px text on phones so iOS never zooms in on focus;
 * compact pages (admin) drop to 14px from the small breakpoint up. The
 * border is #958E8A (3.2:1), the minimum for a control edge.
 */
export const fieldBase = [
    'w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground',
    'placeholder:text-muted-foreground',
    'transition-[border-color,box-shadow] duration-150 ease-out outline-none',
    'focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25',
    'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
    'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15',
    'in-data-[density=compact]:sm:text-sm',
].join(' ')

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                fieldBase,
                'h-11 px-3.5 in-data-[density=compact]:h-9 in-data-[density=compact]:px-3',
                'file:me-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
                className,
            )}
            {...props}
        />
    )
}

export { Input }
