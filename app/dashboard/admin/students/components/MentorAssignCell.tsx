'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'

interface MentorOption {
    id: string
    name: string
}

interface MentorAssignCellProps {
    studentId: string
    currentMentorId: string | null
    mentors: MentorOption[]
    onSaved?: () => void
}

export function MentorAssignCell({ studentId, currentMentorId, mentors, onSaved }: MentorAssignCellProps) {
    const [selected, setSelected] = useState<string>(currentMentorId || '')
    const [savedMentorId, setSavedMentorId] = useState<string | null>(currentMentorId)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // The parent loads assignments asynchronously, so currentMentorId can arrive
    // (or change after a save) *after* this cell has already mounted. Keep local
    // state in sync with the prop, otherwise the dropdown stays on its initial
    // "Unassigned" value even though a mentor is assigned in the DB.
    useEffect(() => {
        setSelected(currentMentorId || '')
        setSavedMentorId(currentMentorId)
    }, [currentMentorId])

    const hasChanged = selected !== (savedMentorId || '') && !!selected

    const handleSave = async () => {
        if (!selected || selected === savedMentorId) return
        setSaving(true)
        setError(null)
        setSuccess(false)
        try {
            const res = await fetch('/api/admin/students/assign-mentor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: studentId, mentor_id: selected }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Failed to assign mentor')
            }
            setSavedMentorId(selected)
            setSuccess(true)
            onSaved?.()
        } catch (err: any) {
            setError(err?.message || 'Something went wrong')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
            <div className="flex items-center gap-2">
                <select
                    value={selected}
                    onChange={(e) => {
                        setSelected(e.target.value)
                        setError(null)
                        setSuccess(false)
                    }}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
                >
                    <option value="">Unassigned</option>
                    {mentors.map((mentor) => (
                        <option key={mentor.id} value={mentor.id}>
                            {mentor.name}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    disabled={!hasChanged || saving}
                    onClick={handleSave}
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                        !hasChanged || saving
                            ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                            : 'border-accent/20 bg-accent text-white hover:bg-accent/90'
                    }`}
                    title="Save mentor assignment"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
            </div>
            {error && (
                <span className="flex items-center gap-1 text-[11px] text-red-600">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {error}
                </span>
            )}
            {success && !error && (
                <span className="text-[11px] text-emerald-600 font-medium">Mentor assigned &amp; notified</span>
            )}
        </div>
    )
}
