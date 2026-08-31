'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    Users,
    Loader2,
    ChevronRight
} from 'lucide-react'
import { MentorActions } from './components/MentorActions'
import { fetchMentors, Mentor, MentorStatusCounts } from './actions'
import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'
import { sortBySubjectPriority } from '@/lib/subject-priority'

// Flatten subjects for filter
const ALL_SUBJECTS = Array.from(new Set(Object.values(SUBJECT_OPTIONS).flat())).sort()

// The five things a mentor has to finish, in the order they finish them. The
// Onboarding column draws one bar per step, so admins can see *which* step is
// outstanding instead of only how many.
const ONBOARDING_STEPS: { label: string; isDone: (m: Mentor) => boolean }[] = [
    { label: 'Questionnaire', isDone: m => !!m.questionnaire_completed_at },
    { label: 'Contract', isDone: m => !!m.contract_signed_at },
    { label: 'DBS certificate', isDone: m => !!m.dbs_certificate_url },
    { label: 'Payouts', isDone: m => !!m.payouts_enabled },
    { label: 'Profile', isDone: m => !!m.profile_completed_at || (!!m.bio && !!m.photo_url) }
]

function getOnboardingStatus(mentor: Mentor) {
    const steps = ONBOARDING_STEPS.map(step => ({ label: step.label, done: step.isDone(mentor) }))
    const completed = steps.filter(s => s.done).length
    const missing = steps.filter(s => !s.done).map(s => s.label)
    return { steps, completed, total: steps.length, missing }
}

// Stored status values are database strings; these are what an admin reads.
const statusLabels: Record<string, string> = {
    active: 'Active',
    pending_approval: 'Pending review',
    details_required: 'Incomplete'
}

const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-100',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-100',
    details_required: 'bg-gray-50 text-gray-600 border-gray-100'
}

const statusIcons: Record<string, any> = {
    active: CheckCircle2,
    pending_approval: Clock,
    details_required: XCircle
}

// Subject column: degree subjects first, collapsed to two chips. Expands in
// place when subjects are hidden or a visible chip is too long to fit.
const CHIP_TRUNCATES_AT = 14

function MentorSubjects({ expertise }: { expertise: string[] | null }) {
    const [expanded, setExpanded] = useState(false)
    const subjects = sortBySubjectPriority(expertise)

    if (subjects.length === 0) {
        return <span className="text-xs text-gray-400">-</span>
    }

    const visible = expanded ? subjects : subjects.slice(0, 2)
    const hidden = subjects.length - visible.length
    const isClipped = !expanded && visible.some(exp => exp.length > CHIP_TRUNCATES_AT)

    return (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
            {visible.map((exp, i) => (
                <span
                    key={i}
                    title={exp}
                    className={`px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs ${expanded ? '' : 'truncate max-w-[100px]'}`}
                >
                    {exp}
                </span>
            ))}
            {(hidden > 0 || isClipped) && (
                <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    title={subjects.join(', ')}
                    className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-medium hover:bg-gray-200 hover:text-gray-700 transition-colors"
                >
                    {hidden > 0 ? `+${hidden} more` : 'View all'}
                </button>
            )}
            {expanded && (
                <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="px-2 py-0.5 text-xs font-medium text-accent hover:underline"
                >
                    Show less
                </button>
            )}
        </div>
    )
}

// One bar per onboarding step. Amber while incomplete, green once every step is
// done; the tooltip names exactly what is outstanding.
function OnboardingBars({ mentor }: { mentor: Mentor }) {
    const { steps, completed, total, missing } = getOnboardingStatus(mentor)
    const isComplete = completed === total

    return (
        <div
            className="flex items-center gap-2"
            title={isComplete ? 'All steps complete' : `Missing: ${missing.join(', ')}`}
        >
            <div className="flex gap-0.5">
                {steps.map((step, i) => (
                    <span
                        key={i}
                        className={`block w-3.5 h-1.5 rounded-sm ${step.done
                            ? isComplete ? 'bg-green-500' : 'bg-amber-400'
                            : 'bg-gray-200'
                            }`}
                    />
                ))}
            </div>
            <span className="text-xs font-semibold text-gray-600 tabular-nums">
                {isComplete ? 'Complete' : `${completed} of ${total}`}
            </span>
        </div>
    )
}

// The status tiles double as the status filter, replacing the old dropdown.
const STATUS_TILES: { value: string; label: string; accent: string }[] = [
    { value: 'all', label: 'All mentors', accent: 'bg-accent' },
    { value: 'active', label: 'Active', accent: 'bg-green-500' },
    { value: 'pending_approval', label: 'Pending review', accent: 'bg-amber-400' },
    { value: 'details_required', label: 'Incomplete', accent: 'bg-gray-300' }
]

export default function AdminMentorsPage() {
    const router = useRouter()
    const [mentors, setMentors] = useState<Mentor[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [universityFilter, setUniversityFilter] = useState('all')
    const [subjectFilter, setSubjectFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [statusCounts, setStatusCounts] = useState<MentorStatusCounts>({
        all: 0,
        active: 0,
        pending_approval: 0,
        details_required: 0
    })
    const limit = 10

    const loadMentors = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await fetchMentors(statusFilter, searchTerm, universityFilter, subjectFilter, page, limit)
            setMentors(result.mentors)
            setTotalCount(result.totalCount)
            setStatusCounts(result.statusCounts)
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

    // The whole row navigates to the mentor page. Anything the admin can click
    // *inside* the row - the name link, the subject expander, the row actions -
    // handles its own click, so those are skipped here.
    const openMentor = (event: React.MouseEvent<HTMLTableRowElement>, mentorId: string) => {
        if ((event.target as HTMLElement).closest('a, button')) return
        router.push(`/dashboard/admin/mentors/${mentorId}`)
    }

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

            {/* Status summary — also the status filter */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {STATUS_TILES.map(tile => {
                    const isActive = statusFilter === tile.value
                    return (
                        <button
                            key={tile.value}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => {
                                setStatusFilter(tile.value)
                                setPage(1)
                            }}
                            className={`text-left bg-white border rounded-2xl p-4 shadow-sm transition-all ${isActive
                                ? 'border-accent ring-2 ring-accent/10'
                                : 'border-gray-100 hover:border-gray-200 hover:shadow'
                                }`}
                        >
                            <span className={`block w-8 h-1 rounded-full mb-3 ${tile.accent}`} />
                            <span className="block text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                                {statusCounts[tile.value as keyof MentorStatusCounts]}
                            </span>
                            <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                                {tile.label}
                            </span>
                        </button>
                    )
                })}
            </div>

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
                                ? `No mentors with status: "${statusLabels[statusFilter] || statusFilter}"`
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
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {mentors.map((mentor) => {
                                        const currentStatus = mentor.status || 'details_required'
                                        const StatusIcon = statusIcons[currentStatus] || Clock
                                        const name = mentor.profile?.full_name || 'Unknown'
                                        return (
                                            <tr
                                                key={mentor.id}
                                                onClick={(e) => openMentor(e, mentor.id)}
                                                className="hover:bg-accent/[0.03] transition-colors group cursor-pointer"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                                                            {mentor.photo_url ? (
                                                                <img src={mentor.photo_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                name[0] || 'M'
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/dashboard/admin/mentors/${mentor.id}`}
                                                                className="block font-semibold text-gray-900 truncate max-w-[180px] group-hover:text-accent group-hover:underline underline-offset-2"
                                                            >
                                                                {name}
                                                            </Link>
                                                            <div className="text-xs text-gray-400 truncate max-w-[180px]">
                                                                {mentor.profile?.email ? (
                                                                    <a
                                                                        href={`mailto:${mentor.profile.email}`}
                                                                        title={`Email ${name}`}
                                                                        className="hover:text-accent hover:underline underline-offset-2"
                                                                    >
                                                                        {mentor.profile.email}
                                                                    </a>
                                                                ) : (
                                                                    'No email'
                                                                )}
                                                                {mentor.phone && (
                                                                    <>
                                                                        {' · '}
                                                                        <a href={`tel:${mentor.phone}`} className="hover:text-accent hover:underline underline-offset-2">
                                                                            {mentor.phone}
                                                                        </a>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-sm text-gray-700 font-medium">
                                                        {mentor.university || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <MentorSubjects expertise={mentor.expertise} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[currentStatus]}`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        {statusLabels[currentStatus] || currentStatus.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <OnboardingBars mentor={mentor} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-sm font-semibold text-gray-900 tabular-nums">{mentor.sessions_completed}</span>
                                                    <span className="text-xs text-gray-400 ml-1">completed</span>
                                                </td>
                                                {/* Avg Rating Removed */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-xs font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            View profile
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-accent transition-colors shrink-0" />
                                                        <span className="w-px self-stretch bg-gray-100" aria-hidden="true" />
                                                        <MentorActions mentorId={mentor.id} currentStatus={currentStatus} mentorName={name} photoUrl={mentor.photo_url} />
                                                    </div>
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
