'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, AlertCircle, X } from 'lucide-react'

interface MentorOption {
    id: string
    name: string
}

interface MentorAssignCellProps {
    studentId: string
    currentMentorIds: string[]
    mentors: MentorOption[]
    onSaved?: () => void
}

export function MentorAssignCell({ studentId, currentMentorIds, mentors, onSaved }: MentorAssignCellProps) {
    const [open, setOpen] = useState(false)
    const [pendingMentorId, setPendingMentorId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const mentorNameById = (id: string) => mentors.find((m) => m.id === id)?.name || 'Mentor'

    const toggleMentor = async (mentorId: string, isCurrentlyAssigned: boolean) => {
        setPendingMentorId(mentorId)
        setError(null)
        try {
            const endpoint = isCurrentlyAssigned
                ? '/api/admin/students/unassign-mentor'
                : '/api/admin/students/assign-mentor'
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: studentId, mentor_id: mentorId }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Failed to update mentor assignment')
            }
            onSaved?.()
        } catch (err: any) {
            setError(err?.message || 'Something went wrong')
        } finally {
            setPendingMentorId(null)
        }
    }

    return (
        <div className="relative min-w-[200px]" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 hover:border-gray-300 transition-colors"
            >
                <div className="flex flex-wrap gap-1 min-h-[20px] items-center">
                    {currentMentorIds.length === 0 ? (
                        <span className="text-gray-400">Unassigned</span>
                    ) : (
                        currentMentorIds.map((id) => (
                            <span
                                key={id}
                                className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium px-2 py-0.5 rounded-full"
                            >
                                {mentorNameById(id)}
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-20 mt-1 w-full min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto py-1">
                    {mentors.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-400">No mentors available</div>
                    ) : (
                        mentors.map((mentor) => {
                            const isAssigned = currentMentorIds.includes(mentor.id)
                            const isPending = pendingMentorId === mentor.id
                            return (
                                <label
                                    key={mentor.id}
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isAssigned}
                                        disabled={isPending}
                                        onChange={() => toggleMentor(mentor.id, isAssigned)}
                                        className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent/40"
                                    />
                                    <span className="flex-1 truncate">{mentor.name}</span>
                                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" />}
                                </label>
                            )
                        })
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-1 text-[11px] text-red-600 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    )
}
