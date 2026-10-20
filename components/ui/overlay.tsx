'use client'

import * as React from 'react'
import {
    Popover as PopoverPrimitive,
    DropdownMenu as MenuPrimitive,
    Tooltip as TooltipPrimitive,
} from 'radix-ui'
import { Check, CaretRight } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'

/**
 * Floating layers that hang off a trigger: popover, dropdown menu, tooltip.
 * Each one scales in from the trigger (origin-aware, emil-design-eng), from
 * 0.96 with a fade, in 150ms on the strong ease-out; exits are quicker.
 * Scrollable ones contain their own scroll (better-ui).
 */
const floatingMotion = [
    'origin-(--radix-popper-transform-origin)',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-96 data-[state=open]:duration-150 data-[state=open]:ease-snappy',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-96 data-[state=closed]:duration-100',
    'motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100',
].join(' ')

const floatingSurface = 'z-[1100] rounded-card border border-transparent bg-popover text-popover-foreground shadow-overlay outline-none'

/* ── Popover ─────────────────────────────────────────────────────────────── */

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

function PopoverContent({
    className,
    align = 'center',
    sideOffset = 6,
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                data-slot="popover-content"
                align={align}
                sideOffset={sideOffset}
                className={cn(floatingSurface, floatingMotion, 'w-72 overscroll-contain p-4', className)}
                {...props}
            />
        </PopoverPrimitive.Portal>
    )
}

/* ── Dropdown menu ───────────────────────────────────────────────────────── */

const DropdownMenu = MenuPrimitive.Root
const DropdownMenuTrigger = MenuPrimitive.Trigger
const DropdownMenuGroup = MenuPrimitive.Group
const DropdownMenuSub = MenuPrimitive.Sub

function DropdownMenuContent({
    className,
    sideOffset = 6,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Content>) {
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Content
                data-slot="dropdown-menu-content"
                sideOffset={sideOffset}
                className={cn(
                    floatingSurface,
                    floatingMotion,
                    'max-h-(--radix-dropdown-menu-content-available-height) min-w-44 overflow-y-auto overscroll-contain p-1',
                    className,
                )}
                {...props}
            />
        </MenuPrimitive.Portal>
    )
}

const itemBase = [
    'relative flex cursor-default items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-sm outline-none select-none',
    'data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
].join(' ')

function DropdownMenuItem({
    className,
    variant = 'default',
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & { variant?: 'default' | 'destructive' }) {
    return (
        <MenuPrimitive.Item
            data-slot="dropdown-menu-item"
            className={cn(
                itemBase,
                variant === 'destructive' && 'text-destructive data-[highlighted]:bg-tint-rose [&_svg]:text-destructive',
                className,
            )}
            {...props}
        />
    )
}

function DropdownMenuCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
    return (
        <MenuPrimitive.CheckboxItem className={cn(itemBase, 'pe-8', className)} {...props}>
            {children}
            <MenuPrimitive.ItemIndicator className="absolute end-2.5">
                <Check weight="bold" className="!text-foreground" />
            </MenuPrimitive.ItemIndicator>
        </MenuPrimitive.CheckboxItem>
    )
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Label>) {
    return <MenuPrimitive.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', className)} {...props} />
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>) {
    return <MenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}

function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof MenuPrimitive.SubTrigger>) {
    return (
        <MenuPrimitive.SubTrigger className={cn(itemBase, 'data-[state=open]:bg-muted', className)} {...props}>
            {children}
            <CaretRight className="ms-auto" />
        </MenuPrimitive.SubTrigger>
    )
}

function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.SubContent>) {
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.SubContent className={cn(floatingSurface, floatingMotion, 'min-w-40 p-1', className)} {...props} />
        </MenuPrimitive.Portal>
    )
}

/* ── Tooltip ─────────────────────────────────────────────────────────────── */

/**
 * Wrap the app once. After the first tooltip has opened, neighbours open
 * instantly with no delay (skipDelayDuration), which makes a toolbar feel
 * faster without accidental pop-ups (emil-design-eng).
 */
function TooltipProvider({ delayDuration = 400, skipDelayDuration = 300, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
    return <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration} {...props} />
}

const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                data-slot="tooltip-content"
                sideOffset={sideOffset}
                className={cn(
                    'z-[1200] max-w-64 rounded-[8px] bg-foreground px-2.5 py-1.5 text-xs font-medium text-background text-balance',
                    'origin-(--radix-tooltip-content-transform-origin)',
                    'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-96 data-[state=delayed-open]:duration-125',
                    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-75',
                    className,
                )}
                {...props}
            >
                {children}
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    )
}

export {
    Popover,
    PopoverTrigger,
    PopoverAnchor,
    PopoverContent,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuGroup,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    TooltipProvider,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
}
