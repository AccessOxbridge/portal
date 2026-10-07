'use client'

import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from '@/utils/lib'

/**
 * Tabs switch instantly: they're used many times a day, so a sliding
 * indicator would only slow them down (better-ui, emil-design-eng).
 */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn(
                'no-scrollbar inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full bg-muted p-1',
                'in-data-[density=compact]:rounded-control',
                className,
            )}
            {...props}
        />
    )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none',
                'in-data-[density=compact]:h-7 in-data-[density=compact]:rounded-[6px] in-data-[density=compact]:px-3',
                'text-muted-foreground transition-colors duration-150 hover:text-foreground',
                'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-border',
                'focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50',
                '[&_svg]:size-4 [&_svg]:shrink-0',
                className,
            )}
            {...props}
        />
    )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
