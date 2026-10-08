'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * The browser's confirm(), as an on-brand dialog. Same contract:
 *
 *     if (!(await confirmDialog({ title: 'Delete this package?' }))) return
 *
 * resolves true only when the confirm button is pressed; Cancel, Escape, the
 * close button, a swipe down or a click outside all resolve false. One
 * ConfirmHost is mounted in the root layout, next to the Toaster.
 */

type ConfirmOptions = {
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
}

type Request = ConfirmOptions & { resolve: (ok: boolean) => void }

let show: ((request: Request) => void) | null = null

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        // No host mounted (should not happen): fall back to the browser's own.
        if (!show) {
            resolve(window.confirm([options.title, options.description].filter(Boolean).join('\n\n')))
            return
        }
        show({ ...options, resolve })
    })
}

export function ConfirmHost() {
    const [request, setRequest] = useState<Request | null>(null)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        show = (next) => {
            setRequest(next)
            setOpen(true)
        }
        return () => {
            show = null
        }
    }, [])

    const settle = (ok: boolean) => {
        request?.resolve(ok)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && settle(false)}>
            {request && (
                <DialogContent size="sm">
                    <DialogHeader className="pb-5">
                        <DialogTitle>{request.title}</DialogTitle>
                        {request.description && <DialogDescription>{request.description}</DialogDescription>}
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => settle(false)}>
                            {request.cancelLabel ?? 'Cancel'}
                        </Button>
                        <Button variant={request.destructive ? 'destructive' : 'default'} onClick={() => settle(true)}>
                            {request.confirmLabel ?? 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    )
}
