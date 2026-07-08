'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
    Search,
    Users,
    Loader2
} from 'lucide-react'
import { StudentActions } from './components/StudentActions'
import { MentorAssignCell } from './components/MentorAssignCell'

interface Student {
    id: string
    school_name: string | null
    year_group: string | null
    target_university: string | null
    target_course: string | null
    parent_email: string | null
    is_complete: boolean
    created_at: string
    profile: {
        full_name: string | null
        email: string | null
    } | null
}

interface MentorOption {
    id: string
    name: string
}

export default function AdminStudentsPage() {
    const supabase = createClient()
    const [students, setStudents] = useState<Student[]>([])
    const [mentors, setMentors] = useState<MentorOption[]>([])
    const [assignments, setAssignments] = useState<Record<string, string[]>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const limit = 10

    const fetchMentorsAndAssignments = async () => {
        const { data: mentorRows } = await supabase
            .from('mentors')
            .select(`
                id,
                profile:profiles!mentors_id_fkey (
                    full_name
                )
            `)

        const mentorOptions: MentorOption[] = (mentorRows || [])
            .filter((m: any) => m.profile?.full_name)
            .map((m: any) => ({ id: m.id as string, name: m.profile.full_name as string }))
            .sort((a: MentorOption, b: MentorOption) => a.name.localeCompare(b.name))
        setMentors(mentorOptions)

        const { data: assignmentRows } = await supabase
            .from('student_mentor_assignments')
            .select('student_id, mentor_id')
            .eq('is_current', true)

        const map: Record<string, string[]> = {}
        ;(assignmentRows || []).forEach((row: any) => {
            if (!map[row.student_id]) map[row.student_id] = []
            map[row.student_id].push(row.mentor_id)
        })
        setAssignments(map)
    }

    const fetchStudents = async () => {
        setIsLoading(true)

        const { data, error } = await supabase
            .from('student_profiles')
            .select(`
                *,
                profile:profiles!student_profiles_id_fkey (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false })

        if (!error && data) {
            let filtered = data as Student[]
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                filtered = filtered.filter(student => {
                    const nameMatch = student.profile?.full_name?.toLowerCase().includes(term)
                    const uniMatch = student.target_university?.toLowerCase().includes(term)
                    return nameMatch || uniMatch
                })
            }

            const offset = (page - 1) * limit
            const paginated = filtered.slice(offset, offset + limit)

            setStudents(paginated)
            setTotalCount(filtered.length)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchStudents()
    }, [searchTerm, page])

    useEffect(() => {
        fetchMentorsAndAssignments()
    }, [])

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
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Students</h1>
                    <p className="text-gray-500 mt-1">Manage all students on the platform.</p>
                </div>
            </header>

            {/* Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLoading ? 'text-accent animate-pulse' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Search by name or target university..."
                        value={debouncedSearch}
                        onChange={(e) => setDebouncedSearch(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No students found</h3>
                        <p className="text-gray-500 max-w-sm">
                            {searchTerm ? `No students matching "${searchTerm}"` : 'No students have completed their profile yet.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">School</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Target</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Mentor</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {students.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                                        {student.profile?.full_name?.[0] || 'S'}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-gray-900 truncate">{student.profile?.full_name || 'Unknown'}</span>
                                                        <span className="text-[10px] text-gray-400 truncate">{student.profile?.email || 'No email'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-900">{student.school_name || '-'}</span>
                                                    <span className="text-[10px] text-gray-400">{student.year_group || ''}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{student.target_university || '-'}</span>
                                                    <span className="text-[10px] text-gray-400">{student.target_course || ''}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <MentorAssignCell
                                                    studentId={student.id}
                                                    currentMentorIds={assignments[student.id] || []}
                                                    mentors={mentors}
                                                    onSaved={() => fetchMentorsAndAssignments()}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                                {format(new Date(student.created_at), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <StudentActions student={student} onSaved={() => fetchStudents()} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                Showing <span className="font-semibold text-gray-900">{offset + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(offset + limit, totalCount)}</span> of <span className="font-semibold text-gray-900">{totalCount}</span> students
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
