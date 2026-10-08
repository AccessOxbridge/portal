'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
    MagnifyingGlass as Search,
    Users,
    CircleNotch as Loader2,
} from '@phosphor-icons/react/ssr'
import { StudentActions } from './components/StudentActions'
import { MentorAssignCell } from './components/MentorAssignCell'
import { AdjustCreditsCell } from '@/components/admin/adjust-credits-cell'

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
        credits: number | null
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
                    email,
                    credits
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
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Students</h1>
                    <p className="text-muted-foreground mt-1">Manage all students on the platform.</p>
                </div>
            </header>

            {/* Search */}
            <div className="border border-transparent flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-card shadow-border">
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${isLoading ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                    <input
                        type="text"
                        placeholder="Search by name or target university..."
                        value={debouncedSearch}
                        onChange={(e) => setDebouncedSearch(e.target.value)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-10"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="border border-transparent bg-card rounded-card shadow-border">
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="size-8 text-primary animate-spin" />
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mb-4">
                            <Users className="size-8 text-muted-foreground/60" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No students found</h3>
                        <p className="text-muted-foreground max-w-sm">
                            {searchTerm ? `No students matching "${searchTerm}"` : 'No students have completed their profile yet.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/60 border-b border-border">
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Student</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">School</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Target</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Mentor</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Hours</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Joined</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {students.map((student) => (
                                        <tr key={student.id} className="hover:bg-muted/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-tint-blue text-tint-blue-foreground flex items-center justify-center font-semibold text-sm shrink-0">
                                                        {student.profile?.full_name?.[0] || 'S'}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-foreground truncate">{student.profile?.full_name || 'Unknown'}</span>
                                                        <span className="text-[10px] text-muted-foreground truncate">{student.profile?.email || 'No email'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-foreground">{student.school_name || '-'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{student.year_group || ''}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">{student.target_university || '-'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{student.target_course || ''}</span>
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
                                            <td className="px-6 py-4">
                                                <AdjustCreditsCell
                                                    studentId={student.id}
                                                    studentName={student.profile?.full_name || 'Student'}
                                                    studentEmail={student.profile?.email}
                                                    credits={student.profile?.credits ?? 0}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground font-medium">
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
                        <div className="px-6 py-4 border-t border-border bg-muted/60 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Showing <span className="font-semibold text-foreground">{offset + 1}</span> to <span className="font-semibold text-foreground">{Math.min(offset + limit, totalCount)}</span> of <span className="font-semibold text-foreground">{totalCount}</span> students
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
