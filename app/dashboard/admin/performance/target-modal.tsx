'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { WarningCircle as AlertCircle, CircleNotch as Loader2, Target, X } from '@phosphor-icons/react/ssr'
import { SessionTargetFields, todayIso, type TargetDraft } from '@/components/admin/session-target-fields'
import { MAX_TARGET_NOTE } from '@/lib/session-frequency'
import { removeStudentTarget, saveStudentTarget } from './actions'
import type { StudentPaceRow } from './data'

export default function TargetModal({ row, onClose }: { row: StudentPaceRow; onClose: () => void }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [confirmRemove, setConfirmRemove] = useState(false)
    const [draft, setDraft] = useState<TargetDraft>(() =>
        row.target
            ? {
                  planType: row.target.planType,
                  sessions: String(row.target.sessions),
                  weeks: String(row.target.weeks),
                  startDate: row.target.startDate,
              }
            : {
                  planType: 'package',
                  sessions: '',
                  weeks: '',
                  // Most existing students started their package at their first session.
                  startDate: row.firstCompletedDate || todayIso(),
              }
    )
    const [note, setNote] = useState(row.target?.note || '')

    const close = () => {
        if (!isPending) onClose()
    }

    const save = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
            const result = await saveStudentTarget(row.studentId, { ...draft, note })
            if ('error' in result) {
                setError(result.error)
                return
            }
            router.refresh()
            onClose()
        })
    }

    const remove = () => {
        if (!confirmRemove) {
            setConfirmRemove(true)
            return
        }
        setError(null)
        startTransition(async () => {
            const result = await removeStudentTarget(row.studentId)
            if ('error' in result) {
                setError(result.error)
                return
            }
            router.refresh()
            onClose()
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
            onClick={close}
        >
            <div
                className="relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-sheet border border-transparent bg-card shadow-overlay animate-in fade-in-0 zoom-in-96 duration-200 ease-snappy motion-reduce:animate-none"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="target-modal-title"
            >
                <button
                    onClick={close}
                    disabled={isPending}
                    className="absolute top-5 right-5 p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-full transition-[background-color,box-shadow,color] duration-150 disabled:opacity-50"
                    aria-label="Close"
                >
                    <X className="size-5" />
                </button>

                <form onSubmit={save} className="p-8 space-y-6">
                    <div>
                        <div className="size-12 bg-primary/10 rounded-card flex items-center justify-center mb-4">
                            <Target className="size-6 text-primary" />
                        </div>
                        <h2 id="target-modal-title" className="text-2xl font-semibold text-foreground">
                            {row.target ? 'Edit session plan' : 'Set session plan'}
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            {row.name}
                            {row.completedAllTime > 0 && (
                                <span className="text-muted-foreground"> · {row.completedAllTime} completed so far</span>
                            )}
                        </p>
                    </div>

                    <SessionTargetFields value={draft} onChange={setDraft} namePrefix="edit_target_" />

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground ml-1" htmlFor="edit_target_note">
                            Note <span className="font-normal text-muted-foreground">(optional)</span>
                        </label>
                        <textarea
                            id="edit_target_note"
                            rows={2}
                            maxLength={MAX_TARGET_NOTE}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Pays weekly for 2–3 hours"
                            className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm py-2.5 px-3.5 leading-relaxed resize-none"
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-card bg-tint-rose text-tint-rose-foreground border border-border">
                            <AlertCircle className="size-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {row.target && (
                            <button
                                type="button"
                                onClick={remove}
                                disabled={isPending}
                                className={`px-4 py-3 rounded-card text-sm font-semibold transition-[background-color,box-shadow,color] duration-150 disabled:opacity-50 ${
                                    confirmRemove
                                        ? 'bg-destructive text-white hover:bg-destructive/90'
                                        : 'text-destructive hover:bg-tint-rose'
                                }`}
                            >
                                {confirmRemove ? 'Confirm remove' : 'Remove'}
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 py-3 bg-primary text-white rounded-card font-semibold hover:opacity-90 transition-[background-color,box-shadow,color] duration-150 shadow-border shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isPending ? <Loader2 className="size-5 animate-spin" /> : 'Save plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
