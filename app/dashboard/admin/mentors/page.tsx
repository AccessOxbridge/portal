'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
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
    School,
    BookOpen
} from 'lucide-react'
import { MentorActions } from './components/MentorActions'
import { fetchMentors, Mentor } from './actions'
import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'

// Flatten subjects for filter
const ALL_SUBJECTS = Array.from(new Set(Object.values(SUBJECT_OPTIONS).flat())).sort()

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
    const [mentors, setMentors] = useState<Mentor[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [universityFilter, setUniversityFilter] = useState('all')
    const [subjectFilter, setSubjectFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const limit = 10

    const loadMentors = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await fetchMentors(statusFilter, searchTerm, universityFilter, subjectFilter, page, limit)
            setMentors(result.mentors)
            setTotalCount(result.totalCount)
        } catch (error) {
            console.error('Error loading mentors:', error)
        } finally {
            setIsLoading(false)
        }
    }, [statusFilter, searchTerm, universityFilter, subjectFilter, page])

    useEffect(() => {
        loadMentors()
    }, [loadMentors])

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
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {/* Status Filter */}
                    <div className="relative w-full md:w-auto">
                        <select
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 focus:outline-none appearance-none w-full md:w-auto cursor-pointer pr-10"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value)
                                setPage(1)
                            }}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="pending_approval">Pending/Review</option>
                            <option value="details_required">Incomplete</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* University Filter */}
                    <div className="relative w-full md:w-auto">
                        <select
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 focus:outline-none appearance-none w-full md:w-auto cursor-pointer pr-10"
                            value={universityFilter}
                            onChange={(e) => {
                                setUniversityFilter(e.target.value)
                                setPage(1)
                            }}
                        >
                            <option value="all">All Universities</option>
                            <option value="oxford">Oxford</option>
                            <option value="cambridge">Cambridge</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* Subject Filter */}
                    <div className="relative w-full md:w-auto">
                        <select
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 focus:outline-none appearance-none w-full md:w-auto cursor-pointer pr-10 max-w-[200px]"
                            value={subjectFilter}
                            onChange={(e) => {
                                setSubjectFilter(e.target.value)
                                setPage(1)
                            }}
                        >
                            <option value="all">All Subjects</option>
                            {ALL_SUBJECTS.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
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
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">University</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Onboarding</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Sessions</th>
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
                                                    <Link href={`/dashboard/admin/mentors/${mentor.id}`} className="flex items-center gap-3 group-hover:opacity-80 transition-opacity">
                                                        <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                                                            {mentor.photo_url ? (
                                                                <img src={mentor.photo_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                mentor.profile?.full_name?.[0] || 'M'
                                                            )}
                                                        </div>
                                                        <span className="font-semibold text-gray-900 truncate max-w-[150px]">{mentor.profile?.full_name || 'Unknown'}</span>
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-sm text-gray-700 font-medium">
                                                        {mentor.university || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {mentor.expertise?.slice(0, 2).map((exp, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs truncate max-w-[100px]">
                                                                {exp}
                                                            </span>
                                                        ))}
                                                        {mentor.expertise && mentor.expertise.length > 2 && (
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                                                                +{mentor.expertise.length - 2}
                                                            </span>
                                                        )}
                                                        {(!mentor.expertise || mentor.expertise.length === 0) && (
                                                            <span className="text-xs text-gray-400">-</span>
                                                        )}
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
                                                {/* Avg Rating Removed */}
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
