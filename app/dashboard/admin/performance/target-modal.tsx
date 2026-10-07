'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Target, X } from 'lucide-react'
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={close}
        >
            <div
                className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="target-modal-title"
            >
                <button
                    onClick={close}
                    disabled={isPending}
                    className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all disabled:opacity-50"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                <form onSubmit={save} className="p-8 space-y-6">
                    <div>
                        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-4">
                            <Target className="w-6 h-6 text-accent" />
                        </div>
                        <h2 id="target-modal-title" className="text-2xl font-bold text-gray-900">
                            {row.target ? 'Edit session plan' : 'Set session plan'}
                        </h2>
                        <p className="text-gray-500 mt-1">
                            {row.name}
                            {row.completedAllTime > 0 && (
                                <span className="text-gray-400"> · {row.completedAllTime} completed so far</span>
                            )}
                        </p>
                    </div>

                    <SessionTargetFields value={draft} onChange={setDraft} namePrefix="edit_target_" />

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="edit_target_note">
                            Note <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <textarea
                            id="edit_target_note"
                            rows={2}
                            maxLength={MAX_TARGET_NOTE}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Pays weekly for 2–3 hours"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all resize-none"
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 text-red-700 border border-red-100">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {row.target && (
                            <button
                                type="button"
                                onClick={remove}
                                disabled={isPending}
                                className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50 ${
                                    confirmRemove
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'text-red-600 hover:bg-red-50'
                                }`}
                            >
                                {confirmRemove ? 'Confirm remove' : 'Remove'}
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 py-3 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
