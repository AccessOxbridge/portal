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
    Loader2
} from 'lucide-react'
import { MentorActions } from './components/MentorActions'

interface Mentor {
    id: string
    bio: string | null
    expertise: string[] | null
    status: string | null
    created_at: string
    profile: {
        full_name: string | null
        email: string | null
    } | null
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

        let query = supabase
            .from('mentors')
            .select(`
                *,
                profile:profiles!mentors_id_fkey (
                    full_name,
                    email
                )
            `, { count: 'exact' })

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter as any)
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })

        if (!error && data) {
            // Client-side filtering for search (full_name and expertise)
            let filtered = data as Mentor[]
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                filtered = filtered.filter(mentor => {
                    const nameMatch = mentor.profile?.full_name?.toLowerCase().includes(term)
                    const expertiseMatch = mentor.expertise?.some(exp => exp.toLowerCase().includes(term))
                    return nameMatch || expertiseMatch
                })
            }

            // Apply pagination to filtered results
            const offset = (page - 1) * limit
            const paginatedMentors = filtered.slice(offset, offset + limit)

            setMentors(paginatedMentors)
            setTotalCount(filtered.length)
        }
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
        <div className="space-y-8 max-w-6xl mx-auto">
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
                        placeholder="Search by name or expertise..."
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
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Mentor</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Expertise</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {mentors.map((mentor) => {
                                        const currentStatus = mentor.status || 'details_required'
                                        const StatusIcon = statusIcons[currentStatus] || Clock
                                        return (
                                            <tr key={mentor.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shrink-0">
                                                            {mentor.profile?.full_name?.[0] || 'M'}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-semibold text-gray-900 truncate">{mentor.profile?.full_name || 'Unknown'}</span>
                                                            <span className="text-[10px] text-gray-400 truncate">{mentor.profile?.email || 'No email'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[currentStatus]}`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        {currentStatus.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {mentor.expertise?.slice(0, 2).map((exp: string) => (
                                                            <span key={exp} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                                                                {exp}
                                                            </span>
                                                        ))}
                                                        {(mentor.expertise?.length ?? 0) > 2 && (
                                                            <span className="text-[10px] text-gray-400 font-medium">+{mentor.expertise!.length - 2} more</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                                    {format(new Date(mentor.created_at), 'MMM dd, yyyy')}
                                                </td>
                                                <td className="px-6 py-4 text-right">
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
