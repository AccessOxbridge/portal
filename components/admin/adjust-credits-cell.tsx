'use client'

import { useState } from 'react'
import { AdjustCreditsModal } from '@/components/admin/adjust-credits-modal'

interface AdjustCreditsCellProps {
    studentId: string
    studentName: string
    studentEmail?: string | null
    credits: number
}

export function AdjustCreditsCell({
    studentId,
    studentName,
    studentEmail,
    credits,
}: AdjustCreditsCellProps) {
    // Seeded from the page's fetch, then owned locally so an adjustment shows
    // immediately without re-running the whole student query.
    const [balance, setBalance] = useState(credits)
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="group flex items-center gap-2 text-left"
                title="Adjust hours"
            >
                <span
                    className={`text-sm font-bold ${balance > 0 ? 'text-gray-900' : 'text-red-500'}`}
                >
                    {balance}
                </span>
                <span className="text-[10px] font-medium text-gray-400 group-hover:text-accent transition-colors">
                    Adjust
                </span>
            </button>

            {open && (
                <AdjustCreditsModal
                    studentId={studentId}
                    studentName={studentName}
                    studentEmail={studentEmail}
                    currentCredits={balance}
                    onClose={() => setOpen(false)}
                    onSaved={(next) => setBalance(next)}
                />
            )}
        </>
    )
}
