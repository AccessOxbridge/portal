'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    MagnifyingGlass as Search,
    CheckCircle as CheckCircle2,
    Clock,
    XCircle,
    Users,
    CircleNotch as Loader2,
    CaretRight as ChevronRight,
} from '@phosphor-icons/react/ssr'
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
    active: 'bg-tint-green text-tint-green-foreground border-border',
    pending_approval: 'bg-tint-amber text-tint-amber-foreground border-border',
    details_required: 'bg-muted/60 text-muted-foreground border-border'
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
        return <span className="text-xs text-muted-foreground">-</span>
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
                    className={`px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs ${expanded ? '' : 'truncate max-w-[100px]'}`}
                >
                    {exp}
                </span>
            ))}
            {(hidden > 0 || isClipped) && (
                <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    title={subjects.join(', ')}
                    className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 border border-transparent bg-card text-foreground shadow-border hover:bg-muted h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                >
                    {hidden > 0 ? `+${hidden} more` : 'View all'}
                </button>
            )}
            {expanded && (
                <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="px-2 py-0.5 text-xs font-medium text-primary hover:underline"
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
                            ? isComplete ? 'bg-success' : 'bg-warning'
                            : 'bg-muted'
                            }`}
                    />
                ))}
            </div>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                {isComplete ? 'Complete' : `${completed} of ${total}`}
            </span>
        </div>
    )
}

// The status tiles double as the status filter, replacing the old dropdown.
const STATUS_TILES: { value: string; label: string; accent: string }[] = [
    { value: 'all', label: 'All mentors', accent: 'bg-primary' },
    { value: 'active', label: 'Active', accent: 'bg-success' },
    { value: 'pending_approval', label: 'Pending review', accent: 'bg-warning' },
    { value: 'details_required', label: 'Incomplete', accent: 'bg-muted' }
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
                    <h1 className="text-3xl font-semibold text-foreground tracking-tight">Mentors</h1>
                    <p className="text-muted-foreground mt-1">Manage all mentors on the platform.</p>
                </div>
                <div className="flex gap-3">
                    <button className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 border border-transparent bg-card text-foreground shadow-border hover:bg-muted h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3">
                        Export CSV
                    </button>
                    <Link href="/dashboard/admin/approvals" className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3">
                        Review applications
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
                            className={`border border-transparent text-left bg-card rounded-card p-4 shadow-border transition-[background-color,box-shadow,color] duration-150 ${isActive
                                ? 'border-primary ring-2 ring-primary/10'
                                : 'border-border hover:border-border hover:shadow'
                                }`}
                        >
                            <span className={`block w-8 h-1 rounded-full mb-3 ${tile.accent}`} />
                            <span className="block text-2xl font-semibold text-foreground tracking-tight tabular-nums">
                                {statusCounts[tile.value as keyof MentorStatusCounts]}
                            </span>
                            <span className="block text-[11px] font-semibold text-muted-foreground mt-0.5">
                                {tile.label}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Filters Bar */}
            <div className="border border-transparent flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-card shadow-border">
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${isLoading ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={debouncedSearch}
                        onChange={(e) => setDebouncedSearch(e.target.value)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-10"
                    />
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {/* University Filter */}
                    <div className="relative w-full md:w-auto">
                        <select
                            className="bg-muted/60 border border-border rounded-control px-4 py-2 text-sm font-medium text-muted-foreground focus:outline-none appearance-none w-full md:w-auto cursor-pointer pr-10"
                            value={universityFilter}
                            onChange={(e) => {
                                setUniversityFilter(e.target.value)
                                setPage(1)
                            }}
                        >
                            <option value="all">All universities</option>
                            <option value="oxford">Oxford</option>
                            <option value="cambridge">Cambridge</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* Subject Filter */}
                    <div className="relative w-full md:w-auto">
                        <select
                            className="bg-muted/60 border border-border rounded-control px-4 py-2 text-sm font-medium text-muted-foreground focus:outline-none appearance-none w-full md:w-auto cursor-pointer pr-10 max-w-[200px]"
                            value={subjectFilter}
                            onChange={(e) => {
                                setSubjectFilter(e.target.value)
                                setPage(1)
                            }}
                        >
                            <option value="all">All subjects</option>
                            {ALL_SUBJECTS.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mentors Table */}
            <div className="border border-transparent bg-card rounded-card overflow-hidden shadow-border">
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="size-8 text-primary animate-spin" />
                    </div>
                ) : mentors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mb-4">
                            <Users className="size-8 text-muted-foreground/60" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No mentors found</h3>
                        <p className="text-muted-foreground max-w-sm">
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
                                    <tr className="bg-muted/60 border-b border-border">
                                        <th className="px-5 py-4 text-xs font-semibold text-muted-foreground">Mentor</th>
                                        <th className="px-5 py-4 text-xs font-semibold text-muted-foreground">University</th>
                                        <th className="px-5 py-4 text-xs font-semibold text-muted-foreground">Subject</th>
                                        <th className="px-5 py-4 text-xs font-semibold text-muted-foreground">Status</th>
                                        <th className="px-5 py-4 text-xs font-semibold text-muted-foreground">Onboarding</th>
                                        <th className="px-5 py-4 text-xs font-semibold text-muted-foreground">Sessions</th>
                                        <th className="px-5 py-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {mentors.map((mentor) => {
                                        const currentStatus = mentor.status || 'details_required'
                                        const StatusIcon = statusIcons[currentStatus] || Clock
                                        const name = mentor.profile?.full_name || 'Unknown'
                                        return (
                                            <tr
                                                key={mentor.id}
                                                onClick={(e) => openMentor(e, mentor.id)}
                                                className="hover:bg-primary/[0.03] transition-colors group cursor-pointer"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
                                                            {mentor.photo_url ? (
                                                                <img src={mentor.photo_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                name[0] || 'M'
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/dashboard/admin/mentors/${mentor.id}`}
                                                                className="block font-semibold text-foreground truncate max-w-[180px] group-hover:text-primary group-hover:underline underline-offset-2"
                                                            >
                                                                {name}
                                                            </Link>
                                                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                                {mentor.profile?.email ? (
                                                                    <a
                                                                        href={`mailto:${mentor.profile.email}`}
                                                                        title={`Email ${name}`}
                                                                        className="hover:text-primary hover:underline underline-offset-2"
                                                                    >
                                                                        {mentor.profile.email}
                                                                    </a>
                                                                ) : (
                                                                    'No email'
                                                                )}
                                                                {mentor.phone && (
                                                                    <>
                                                                        {' · '}
                                                                        <a href={`tel:${mentor.phone}`} className="hover:text-primary hover:underline underline-offset-2">
                                                                            {mentor.phone}
                                                                        </a>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-sm text-foreground font-medium">
                                                        {mentor.university || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <MentorSubjects expertise={mentor.expertise} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[currentStatus]}`}>
                                                        <StatusIcon className="size-3.5" />
                                                        {statusLabels[currentStatus] || currentStatus.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <OnboardingBars mentor={mentor} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-sm font-semibold text-foreground tabular-nums">{mentor.sessions_completed}</span>
                                                    <span className="text-xs text-muted-foreground ml-1">completed</span>
                                                </td>
                                                {/* Avg Rating Removed */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            View profile
                                                        </span>
                                                        <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
                                                        <span className="w-px self-stretch bg-muted" aria-hidden="true" />
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
                        <div className="px-6 py-4 border-t border-border bg-muted/60 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Showing <span className="font-semibold text-foreground">{offset + 1}</span> to <span className="font-semibold text-foreground">{Math.min(offset + limit, totalCount)}</span> of <span className="font-semibold text-foreground">{totalCount}</span> mentors
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page <= 1}
                                    className={`px-4 py-2 border border-border rounded-control text-sm font-medium transition-colors ${page <= 1 ? 'pointer-events-none opacity-50 bg-muted/60' : 'bg-card hover:bg-muted/60 text-foreground'}`}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page >= totalPages}
                                    className={`px-4 py-2 border border-border rounded-control text-sm font-medium transition-colors ${page >= totalPages ? 'pointer-events-none opacity-50 bg-muted/60' : 'bg-card hover:bg-muted/60 text-foreground'}`}
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
