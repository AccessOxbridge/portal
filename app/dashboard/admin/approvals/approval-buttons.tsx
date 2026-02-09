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
                className="px-4 py-2.5 rounded-2xl border border-gray-100 text-gray-500 font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {pending ? 'Dismissing...' : children}
            </button>
        )
    }

    return (
        <button
            type="submit"
            disabled={pending}
            className="px-4 py-2.5 rounded-2xl bg-accent text-white font-bold hover:shadow-2xl hover:shadow-accent/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center min-w-[100px]"
        >
            {pending ? (
                <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
