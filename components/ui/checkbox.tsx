'use client'

import * as React from 'react'
import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from 'radix-ui'
import { Check } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(
                'peer grid size-5 shrink-0 place-items-center rounded-[6px] border border-input bg-card outline-none',
                'transition-[background-color,border-color,box-shadow] duration-150 ease-out',
                'focus-visible:ring-[3px] focus-visible:ring-ring/30',
                'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'aria-invalid:border-destructive',
                // A 44px hit area on touch without changing the drawn size.
                'relative after:absolute after:-inset-3 after:content-[""]',
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator className="grid place-items-center">
                <Check weight="bold" className="size-3.5" />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    )
}

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            className={cn(
                'peer relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent outline-none',
                'transition-[background-color,box-shadow] duration-150 ease-out',
                'bg-input/60 data-[state=checked]:bg-primary',
                'focus-visible:ring-[3px] focus-visible:ring-ring/30',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'after:absolute after:-inset-2.5 after:content-[""]',
                className,
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb
                className={cn(
                    'pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0',
                    'transition-[translate] duration-200 ease-snappy',
                    'translate-x-0.5 data-[state=checked]:translate-x-[18px]',
                )}
            />
        </SwitchPrimitive.Root>
    )
}

export { Checkbox, Switch }
