'use client'

import { useEffect, useRef, useState } from 'react'
import { CaretDown as ChevronDown, CircleNotch as Loader2, WarningCircle as AlertCircle, X } from '@phosphor-icons/react/ssr'

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
                className="w-full flex items-center justify-between gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 hover:border-border transition-colors"
            >
                <div className="flex flex-wrap gap-1 min-h-[20px] items-center">
                    {currentMentorIds.length === 0 ? (
                        <span className="text-muted-foreground">Unassigned</span>
                    ) : (
                        currentMentorIds.map((id) => (
                            <span
                                key={id}
                                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full"
                            >
                                {mentorNameById(id)}
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-20 mt-1 w-full min-w-[220px] bg-card border border-border rounded-lg shadow-border max-h-64 overflow-y-auto py-1">
                    {mentors.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No mentors available</div>
                    ) : (
                        mentors.map((mentor) => {
                            const isAssigned = currentMentorIds.includes(mentor.id)
                            const isPending = pendingMentorId === mentor.id
                            return (
                                <label
                                    key={mentor.id}
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isAssigned}
                                        disabled={isPending}
                                        onChange={() => toggleMentor(mentor.id, isAssigned)}
                                        className="size-4 rounded border-border text-primary focus:ring-primary/40"
                                    />
                                    <span className="flex-1 truncate">{mentor.name}</span>
                                    {isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />}
                                </label>
                            )
                        })
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-1 text-[11px] text-destructive mt-1">
                    <AlertCircle className="size-3 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button type="button" onClick={() => setError(null)} className="text-tint-rose-foreground hover:text-destructive">
                        <X className="size-3" />
                    </button>
                </div>
            )}
        </div>
    )
}
