'use client'

import React from 'react'
import { useFormStatus } from 'react-dom'
import { handleApplication } from './actions'

function SubmitButton({
    actionType,
    children
}: {
    actionType: 'approve' | 'dismiss',
    children: React.ReactNode
}) {
    const { pending } = useFormStatus()

    // We want the button to disable immediately upon click
    // pending will be true during the server action execution

    if (actionType === 'dismiss') {
        return (
            <button
                type="submit"
                disabled={pending}
                className="px-4 py-2.5 rounded-card border border-border text-muted-foreground font-semibold hover:bg-tint-rose hover:text-destructive hover:border-border transition-[background-color,box-shadow,color] duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {pending ? 'Dismissing...' : children}
            </button>
        )
    }

    return (
        <button
            type="submit"
            disabled={pending}
            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3 min-w-[100px]"
        >
            {pending ? (
                <div className="flex items-center gap-2">
                    <svg className="animate-spin size-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                </div>
            ) : (
                children
            )}
        </button>
    )
}

export function ApprovalButtons({ applicationId }: { applicationId: string }) {
    return (
        <div className="flex items-center gap-3">
            <form action={handleApplication.bind(null, applicationId, 'dismissed')}>
                <SubmitButton actionType="dismiss">Dismiss</SubmitButton>
            </form>
            <form action={handleApplication.bind(null, applicationId, 'approved')}>
                <SubmitButton actionType="approve">Approve</SubmitButton>
            </form>
        </div>
    )
}
