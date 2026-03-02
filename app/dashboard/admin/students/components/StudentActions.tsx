'use client'

import { Mail, MoreHorizontal, Pencil, X } from 'lucide-react'
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
                    className="p-2 text-gray-400 hover:text-accent transition-colors"
                    title="Email Student"
                    href={`mailto:${email}`}
                >
                    <Mail className="w-4 h-4" />
                </a>
                <button
                    onClick={openEdit}
                    className="p-2 transition-colors rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    title="Edit student"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            {isEditOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-30" onClick={closeEdit} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Edit student</h3>
                            <button
                                onClick={closeEdit}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            {student.profile?.full_name || 'Student'} · {email}
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Parent/guardian email</label>
                            <input
                                type="email"
                                value={parentEmail}
                                onChange={(e) => setParentEmail(e.target.value)}
                                placeholder="e.g., parent@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                            />
                            <p className="mt-1 text-xs text-gray-500">Used for fortnightly progress reports.</p>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeEdit}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="px-4 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50"
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
