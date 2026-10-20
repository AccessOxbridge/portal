'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'

/**
 * One dialog for the whole portal ("ResponsiveDialog" in the plan):
 *   from 640px up: a centred dialog that fades and scales in from 0.96 (200ms)
 *   on phones:     a bottom sheet that slides up on the iOS drawer curve, with
 *                  a grab handle; a drag down or a quick flick closes it
 * Same content and buttons on both, so nothing about what it does changes.
 * Escape and the backdrop close it, focus returns to whatever opened it,
 * and the sheet keeps its own scroll (overscroll-behavior: contain).
 */

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

const SWIPE_DISTANCE = 120 // px dragged down that always closes
const SWIPE_VELOCITY = 0.11 // px per ms: a quick flick closes regardless of distance

function useSwipeToClose(onClose: () => void) {
    const ref = React.useRef<HTMLDivElement>(null)
    const start = React.useRef<{ y: number; t: number } | null>(null)

    const onPointerDown = (e: React.PointerEvent) => {
        // Phones only, and only from the grab handle area at the top.
        if (window.matchMedia('(min-width: 640px)').matches) return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        start.current = { y: e.clientY, t: performance.now() }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: React.PointerEvent) => {
        if (!start.current || !ref.current) return
        const dy = e.clientY - start.current.y
        // Dragging up past the top meets growing resistance instead of a wall.
        const offset = dy > 0 ? dy : -Math.sqrt(-dy) * 2
        ref.current.style.transition = 'none'
        ref.current.style.transform = `translateY(${offset}px)`
    }
    const onPointerUp = (e: React.PointerEvent) => {
        if (!start.current || !ref.current) return
        const dy = e.clientY - start.current.y
        const velocity = dy / Math.max(1, performance.now() - start.current.t)
        start.current = null
        ref.current.style.transition = 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)'
        if (dy > SWIPE_DISTANCE || velocity > SWIPE_VELOCITY) {
            ref.current.style.transform = 'translateY(100%)'
            window.setTimeout(onClose, 200)
        } else {
            ref.current.style.transform = ''
        }
    }
    return { ref, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } }
}

function DialogContent({
    className,
    children,
    showClose = true,
    size = 'md',
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    showClose?: boolean
    size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
    const closeRef = React.useRef<HTMLButtonElement>(null)
    const { ref, handlers } = useSwipeToClose(() => closeRef.current?.click())
    const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-2xl' }[size]

    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
                className={cn(
                    'fixed inset-0 z-[1050] bg-black/40',
                    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200',
                    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150',
                )}
            />
            <DialogPrimitive.Content
                ref={ref}
                data-slot="dialog-content"
                className={cn(
                    'fixed z-[1050] flex flex-col bg-card text-card-foreground shadow-overlay outline-none',
                    // Phones: bottom sheet.
                    'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet pb-[env(safe-area-inset-bottom)]',
                    'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300 data-[state=open]:ease-drawer',
                    'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-200 data-[state=closed]:ease-drawer',
                    // From 640px: centred dialog.
                    'sm:inset-auto sm:start-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-sheet sm:pb-0',
                    'sm:max-h-[min(90dvh,48rem)]',
                    'sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:fade-in-0 sm:data-[state=open]:zoom-in-96 sm:data-[state=open]:duration-200 sm:data-[state=open]:ease-snappy',
                    'sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:fade-out-0 sm:data-[state=closed]:zoom-out-96 sm:data-[state=closed]:duration-150',
                    'motion-reduce:data-[state=open]:slide-in-from-bottom-0 motion-reduce:data-[state=open]:fade-in-0 motion-reduce:data-[state=closed]:slide-out-to-bottom-0 motion-reduce:data-[state=closed]:fade-out-0',
                    width,
                    className,
                )}
                {...props}
            >
                {/* Grab handle (phones). Dragging starts here so the body can still scroll. */}
                <div {...handlers} className="flex shrink-0 touch-none justify-center pt-2.5 pb-1 sm:hidden">
                    <span className="h-1.5 w-10 rounded-full bg-border" />
                </div>
                {children}
                <DialogPrimitive.Close
                    ref={closeRef}
                    className={cn(
                        'absolute end-3 top-3 grid size-9 place-items-center rounded-full text-muted-foreground outline-none',
                        'transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/30',
                        !showClose && 'sr-only',
                    )}
                >
                    <X className="size-5" />
                    <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="dialog-header" className={cn('shrink-0 px-6 pt-4 pe-14 sm:pt-6', className)} {...props} />
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="dialog-body" className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn('flex shrink-0 flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end', className)}
            {...props}
        />
    )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return <DialogPrimitive.Title className={cn('text-lg font-semibold leading-snug text-foreground text-balance', className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return <DialogPrimitive.Description className={cn('mt-1.5 text-sm text-muted-foreground text-pretty', className)} {...props} />
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription }
