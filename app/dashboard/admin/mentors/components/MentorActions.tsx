'use client'

import { createClient } from '@/utils/supabase/client'
import { MoreHorizontal, Mail, ExternalLink, CheckCircle2, Clock, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MentorActionsProps {
    mentorId: string
    currentStatus: string
    email: string
}

export function MentorActions({ mentorId, currentStatus, email }: MentorActionsProps) {
    const supabase = createClient()
    const router = useRouter()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    const updateStatus = async (newStatus: string) => {
        setIsUpdating(true)
        const { error } = await supabase
            .from('mentors')
            .update({ status: newStatus as any })
            .eq('id', mentorId)

        if (!error) {
            router.refresh()
        }
        setIsUpdating(false)
        setIsMenuOpen(false)
    }

    return (
        <div className="relative">
            <div className="flex items-center justify-end gap-2">
                <a className="p-2 text-gray-400 hover:text-accent transition-colors" title="Email Mentor" href={`mailto:${email}`}>
                    <Mail className="w-4 h-4" />
                </a>
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`p-2 transition-colors rounded-lg ${isMenuOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {isUpdating ? <Clock className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                                <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                    Change Status
                                </div>
                                {currentStatus !== 'active' && (
                                    <button
                                        onClick={() => updateStatus('active')}
                                        className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors font-medium"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Set Active
                                    </button>
                                )}
                                {currentStatus !== 'pending_approval' && (
                                    <button
                                        onClick={() => updateStatus('pending_approval')}
                                        className="w-full text-left px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2 transition-colors font-medium"
                                    >
                                        <Clock className="w-4 h-4" />
                                        Set Pending
                                    </button>
                                )}
                                {currentStatus !== 'details_required' && (
                                    <button
                                        onClick={() => updateStatus('details_required')}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors font-medium"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Request Details
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
