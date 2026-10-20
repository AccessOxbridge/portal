import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/utils/lib'
import { Spinner } from '@/components/ui/spinner'

/**
 * Buttons follow the page density (data-density on <html>):
 *   comfortable (students, mentors, public pages): pill shape, 44px tall
 *   compact (admin): 8px corners, 36px tall
 * Press feedback scales to 0.96 over 150ms (better-ui), never when disabled.
 */
const buttonVariants = cva(
    [
        'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium outline-none select-none',
        'rounded-full in-data-[density=compact]:rounded-control',
        'transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out',
        'enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96]',
        'focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-50',
        'aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
        '[-webkit-tap-highlight-color:transparent]',
    ].join(' '),
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/90',
                secondary: 'border border-transparent bg-card text-foreground shadow-border hover:bg-muted',
                outline: 'border border-input bg-card text-foreground hover:bg-muted',
                ghost: 'text-foreground hover:bg-muted',
                brand: 'bg-brand text-brand-foreground hover:bg-brand/90',
                destructive: 'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30',
                'destructive-ghost': 'text-destructive hover:bg-tint-rose',
                link: 'h-auto rounded-none px-0 text-brand underline-offset-4 hover:underline enabled:active:scale-100',
            },
            size: {
                default: 'h-11 px-5 text-base in-data-[density=compact]:h-9 in-data-[density=compact]:px-4 in-data-[density=compact]:text-sm has-[>svg]:ps-4',
                sm: 'h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3 has-[>svg]:ps-3',
                lg: 'h-12 px-6 text-base in-data-[density=compact]:h-10',
                icon: 'size-11 in-data-[density=compact]:size-9',
                'icon-sm': 'size-9 in-data-[density=compact]:size-8',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

type ButtonProps = React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
        /** Shows a spinner, keeps the width and blocks presses. Pair with a label like "Saving…". */
        loading?: boolean
    }

function Button({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }: ButtonProps) {
    const Comp = asChild ? Slot.Root : 'button'
    return (
        <Comp
            data-slot="button"
            data-variant={variant ?? 'default'}
            className={cn(buttonVariants({ variant, size, className }))}
            disabled={asChild ? undefined : disabled || loading}
            aria-busy={loading || undefined}
            {...props}
        >
            {loading && !asChild ? (
                <>
                    <Spinner className="size-4" />
                    {children}
                </>
            ) : (
                children
            )}
        </Comp>
    )
}

export { Button, buttonVariants }
