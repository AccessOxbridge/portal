import * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'
import { cn } from '@/utils/lib'

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
    return (
        <LabelPrimitive.Root
            data-slot="label"
            className={cn(
                'text-sm font-medium leading-snug text-foreground select-none',
                'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
                className,
            )}
            {...props}
        />
    )
}

/**
 * Label above, the control, then help text or an error underneath. The error
 * replaces the help text so the field never grows twice.
 */
function Field({
    label,
    htmlFor,
    help,
    error,
    optional,
    className,
    children,
}: {
    label?: React.ReactNode
    htmlFor?: string
    help?: React.ReactNode
    error?: React.ReactNode
    optional?: boolean
    className?: string
    children: React.ReactNode
}) {
    return (
        <div data-slot="field" className={cn('flex flex-col gap-1.5', className)}>
            {label && (
                <Label htmlFor={htmlFor}>
                    {label}
                    {optional && <span className="ms-1 font-normal text-muted-foreground">(optional)</span>}
                </Label>
            )}
            {children}
            {error ? (
                <p role="alert" className="text-sm text-destructive text-pretty">
                    {error}
                </p>
            ) : help ? (
                <p className="text-sm text-muted-foreground text-pretty">{help}</p>
            ) : null}
        </div>
    )
}

export { Label, Field }
