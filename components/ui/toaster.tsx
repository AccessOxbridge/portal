'use client'

import { Toaster as Sonner, toast } from 'sonner'
import { CheckCircle, Info, WarningCircle, XCircle } from '@phosphor-icons/react/ssr'

/**
 * Toasts (approved in the plan, section 12). Mounted once in the root layout.
 * Bottom-centre on phones so they clear the tab bar, bottom-right on desktop.
 * Every toast has an icon and text, so colour and motion are never the only
 * cue. Sonner uses transitions, so rapid toasts retarget instead of jumping.
 */
function Toaster() {
    return (
        <Sonner
            position="bottom-right"
            offset={24}
            mobileOffset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
            gap={8}
            visibleToasts={3}
            icons={{
                success: <CheckCircle weight="fill" className="size-5 text-success" />,
                error: <XCircle weight="fill" className="size-5 text-destructive" />,
                warning: <WarningCircle weight="fill" className="size-5 text-warning" />,
                info: <Info weight="fill" className="size-5 text-brand" />,
            }}
            toastOptions={{
                classNames: {
                    toast: 'font-sans !rounded-card !border-transparent !bg-popover !text-popover-foreground !shadow-overlay !gap-3 !p-4 !text-sm',
                    title: '!font-medium !text-foreground',
                    description: '!text-muted-foreground',
                    actionButton: '!rounded-full !bg-primary !text-primary-foreground !font-medium',
                    cancelButton: '!rounded-full !bg-muted !text-foreground',
                },
            }}
            style={{ zIndex: 1300 }}
        />
    )
}

export { Toaster, toast }
