'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    Users,
    Loader2,
    Star,
    Mail,
    Phone,
    FileText
} from 'lucide-react'
import { MentorActions } from './components/MentorActions'

interface Mentor {
    id: string
    bio: string | null
    expertise: string[] | null
    status: string | null
    phone: string | null
    created_at: string
    photo_url: string | null
    training_completed_at: string | null
    quiz_completed_at: string | null
    contract_signed_at: string | null
    dbs_certificate_url: string | null
    payouts_enabled: boolean | null
    profile_completed_at: string | null
    profile: {
        full_name: string | null
        email: string | null
    } | null
    sessions_completed: number
    avg_rating: number | null
}

// Helper to calculate onboarding completion
function getOnboardingStatus(mentor: Mentor): { completed: number; total: number; label: string } {
    const steps = [
        !!mentor.training_completed_at,
        !!mentor.quiz_completed_at,
        !!mentor.contract_signed_at,
        !!mentor.dbs_certificate_url,
        !!mentor.payouts_enabled,
        !!mentor.profile_completed_at || (!!mentor.bio && !!mentor.photo_url)
    ]
    const completed = steps.filter(Boolean).length
    const total = steps.length

    if (completed === total) return { completed, total, label: 'Complete' }
    if (completed === 0) return { completed, total, label: 'Not Started' }
    return { completed, total, label: `${completed}/${total}` }
}

const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-100',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-100',
    details_required: 'bg-gray-50 text-gray-700 border-gray-100'
}

const statusIcons: Record<string, any> = {
    active: CheckCircle2,
    pending_approval: Clock,
    details_required: XCircle
}

export default function AdminMentorsPage() {
    const supabase = createClient()
    const [mentors, setMentors] = useState<Mentor[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const limit = 10

    const fetchMentors = async () => {
        setIsLoading(true)

        // Fetch mentors with profiles
        const { data: mentorsData, error } = await supabase
            .from('mentors')
            .select(`
                *,
                profile:profiles!mentors_id_fkey (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false })

        if (error || !mentorsData) {
            setIsLoading(false)
            return
        }

        // Fetch session counts (completed sessions per mentor)
        const { data: sessionCounts } = await supabase
            .from('sessions')
            .select('mentor_id')
            .eq('status', 'completed')

        const sessionCountMap: Record<string, number> = {}
        sessionCounts?.forEach(s => {
            sessionCountMap[s.mentor_id] = (sessionCountMap[s.mentor_id] || 0) + 1
        })

        // Fetch ratings from form_responses (using dedicated rating column)
        const { data: feedbackData } = await supabase
            .from('form_responses')
            .select('session_id, rating')
            .eq('form_type', 'student_feedback')
            .not('rating', 'is', null)

        // Get session -> mentor mapping
        const { data: sessionsData } = await supabase
            .from('sessions')
            .select('id, mentor_id')

        const sessionMentorMap: Record<string, string> = {}
        sessionsData?.forEach(s => {
            sessionMentorMap[s.id] = s.mentor_id
        })

        // Calculate average ratings per mentor
        const ratingMap: Record<string, number[]> = {}
        feedbackData?.forEach(fb => {
            const mentorId = sessionMentorMap[fb.session_id]
            if (mentorId && fb.rating) {
                if (!ratingMap[mentorId]) ratingMap[mentorId] = []
                ratingMap[mentorId].push(fb.rating)
            }
        })

        const avgRatingMap: Record<string, number> = {}
        Object.entries(ratingMap).forEach(([mentorId, ratings]) => {
            avgRatingMap[mentorId] = ratings.reduce((a, b) => a + b, 0) / ratings.length
        })

        // Enrich mentor data
        let enrichedMentors = mentorsData.map(m => ({
            ...m,
            sessions_completed: sessionCountMap[m.id] || 0,
            avg_rating: avgRatingMap[m.id] || null
        })) as unknown as Mentor[]

        // Apply status filter
        if (statusFilter !== 'all') {
            enrichedMentors = enrichedMentors.filter(m => m.status === statusFilter)
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            enrichedMentors = enrichedMentors.filter(mentor => {
                const nameMatch = mentor.profile?.full_name?.toLowerCase().includes(term)
                const expertiseMatch = mentor.expertise?.some(exp => exp.toLowerCase().includes(term))
                return nameMatch || expertiseMatch
            })
        }

        // Paginate
        const offset = (page - 1) * limit
        const paginatedMentors = enrichedMentors.slice(offset, offset + limit)

        setMentors(paginatedMentors)
        setTotalCount(enrichedMentors.length)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchMentors()
    }, [searchTerm, statusFilter, page])

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(debouncedSearch)
            setPage(1)
        }, 400)
        return () => clearTimeout(timer)
    }, [debouncedSearch])

    const totalPages = Math.ceil(totalCount / limit)
    const offset = (page - 1) * limit

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mentors</h1>
                    <p className="text-gray-500 mt-1">Manage all mentors on the platform.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        Export CSV
                    </button>
                    <Link href="/dashboard/admin/approvals" className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-accent/10">
                        Review Applications
                    </Link>
                </div>
            </header>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLoading ? 'text-accent animate-pulse' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={debouncedSearch}
                        onChange={(e) => setDebouncedSearch(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all shadow-inner"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 focus:outline-none w-full md:w-auto cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value)
                            setPage(1)
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="details_required">Details Required</option>
                    </select>
                </div>
            </div>

            {/* Mentors Table */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : mentors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No mentors found</h3>
                        <p className="text-gray-500 max-w-sm">
                            {statusFilter !== 'all'
                                ? `No mentors with status: "${statusFilter.replace('_', ' ')}"`
                                : searchTerm
                                    ? `No mentors matching "${searchTerm}"`
                                    : 'No mentors have been added yet.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Mentor</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Onboarding</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Sessions</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Rating</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {mentors.map((mentor) => {
                                        const currentStatus = mentor.status || 'details_required'
                                        const StatusIcon = statusIcons[currentStatus] || Clock
                                        return (
                                            <tr key={mentor.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shrink-0">
                                                            {mentor.profile?.full_name?.[0] || 'M'}
                                                        </div>
                                                        <span className="font-semibold text-gray-900 truncate max-w-[150px]">{mentor.profile?.full_name || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[currentStatus]}`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        {currentStatus.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {(() => {
                                                        const onboarding = getOnboardingStatus(mentor)
                                                        const isComplete = onboarding.completed === onboarding.total
                                                        return (
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isComplete
                                                                    ? 'bg-green-50 text-green-700 border-green-100'
                                                                    : onboarding.completed === 0
                                                                        ? 'bg-gray-50 text-gray-500 border-gray-100'
                                                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                                                }`}>
                                                                {isComplete && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                                {onboarding.label}
                                                            </span>
                                                        )
                                                    })()}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-sm font-semibold text-gray-900">{mentor.sessions_completed}</span>
                                                    <span className="text-xs text-gray-400 ml-1">completed</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {mentor.avg_rating ? (
                                                        <div className="flex items-center gap-1">
                                                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                            <span className="text-sm font-semibold text-gray-900">{mentor.avg_rating.toFixed(1)}</span>
                                                            <span className="text-xs text-gray-400">/5</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No ratings</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col gap-1 text-xs">
                                                        <a href={`mailto:${mentor.profile?.email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-accent transition-colors">
                                                            <Mail className="w-3 h-3" />
                                                            <span className="truncate max-w-[120px]">{mentor.profile?.email || '-'}</span>
                                                        </a>
                                                        {mentor.phone && (
                                                            <a href={`tel:${mentor.phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-accent transition-colors">
                                                                <Phone className="w-3 h-3" />
                                                                <span>{mentor.phone}</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <MentorActions mentorId={mentor.id} currentStatus={currentStatus} email={mentor.profile?.email || ''} />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                Showing <span className="font-semibold text-gray-900">{offset + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(offset + limit, totalCount)}</span> of <span className="font-semibold text-gray-900">{totalCount}</span> mentors
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page <= 1}
                                    className={`px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium transition-colors ${page <= 1 ? 'pointer-events-none opacity-50 bg-gray-50' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page >= totalPages}
                                    className={`px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium transition-colors ${page >= totalPages ? 'pointer-events-none opacity-50 bg-gray-50' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
