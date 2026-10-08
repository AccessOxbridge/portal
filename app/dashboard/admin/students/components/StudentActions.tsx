'use client'

import { Envelope as Mail, DotsThree as MoreHorizontal, PencilSimple as Pencil, X } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Student {
    id: string
    school_name: string | null
    year_group: string | null
    target_university: string | null
    target_course: string | null
    parent_email: string | null
    profile: { full_name: string | null; email: string | null } | null
}

interface StudentActionsProps {
    student: Student
    onSaved?: () => void
}

export function StudentActions({ student, onSaved }: StudentActionsProps) {
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [parentEmail, setParentEmail] = useState(student.parent_email || '')
    const [saving, setSaving] = useState(false)
    const supabase = createClient()
    const email = student.profile?.email || ''

    const openEdit = () => {
        setParentEmail(student.parent_email || '')
        setIsEditOpen(true)
    }

    const closeEdit = () => {
        setIsEditOpen(false)
    }

    const handleSaveEdit = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('student_profiles')
                .update({
                    parent_email: parentEmail.trim() || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', student.id)

            if (error) throw error
            closeEdit()
            onSaved?.()
        } catch (err) {
            console.error(err)
            alert('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-end gap-2">
                <a
                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    title="Email student"
                    href={`mailto:${email}`}
                >
                    <Mail className="size-4" />
                </a>
                <button
                    onClick={openEdit}
                    className="p-2 transition-colors rounded-lg text-muted-foreground hover:text-muted-foreground hover:bg-muted"
                    title="Edit student"
                >
                    <MoreHorizontal className="size-4" />
                </button>
            </div>

            {isEditOpen && (
                <>
                    <div className="fixed inset-0 z-30 bg-black/40 animate-in fade-in-0 duration-200 motion-reduce:animate-none" onClick={closeEdit} />
                    <div className="border border-transparent fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[calc(100%-2rem)] max-w-md bg-card rounded-sheet p-6 shadow-overlay animate-in fade-in-0 zoom-in-96 duration-200 ease-snappy motion-reduce:animate-none">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-foreground">Edit student</h3>
                            <button
                                onClick={closeEdit}
                                className="p-2 text-muted-foreground hover:text-muted-foreground rounded-lg transition-colors"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            {student.profile?.full_name || 'Student'} · {email}
                        </p>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Parent/guardian email</label>
                            <input
                                type="email"
                                value={parentEmail}
                                onChange={(e) => setParentEmail(e.target.value)}
                                placeholder="e.g., parent@example.com"
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">Used for fortnightly progress reports.</p>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeEdit}
                                className="px-4 py-2.5 rounded-control border border-border text-foreground font-medium hover:bg-muted/60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}
