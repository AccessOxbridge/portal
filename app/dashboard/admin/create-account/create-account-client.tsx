'use client'

import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    Clock,
    GraduationCap,
    KeyRound,
    Loader2,
    Mail,
    Plus,
    RefreshCw,
    Search,
    User,
    UserPlus,
    Users,
    X,
} from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { createMentorAccount, createStudentAccount } from './actions'

type AccountTab = 'student' | 'mentor'

interface StudentAccount {
    id: string
    full_name: string | null
    email: string | null
    credits: number | null
    updated_at: string
}

interface MentorAccount {
    id: string
    full_name: string | null
    email: string | null
    updated_at: string
    status: string
}

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const ALL = UPPER + LOWER + DIGITS

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-100',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-100',
    details_required: 'bg-gray-50 text-gray-700 border-gray-100',
}

function randomChar(alphabet: string): string {
    const bytes = new Uint8Array(1)
    crypto.getRandomValues(bytes)
    return alphabet[bytes[0] % alphabet.length]
}

function generatePassword(): string {
    const chars = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS)]
    while (chars.length < 12) {
        chars.push(randomChar(ALL))
    }
    for (let i = chars.length - 1; i > 0; i--) {
        const bytes = new Uint8Array(1)
        crypto.getRandomValues(bytes)
        const j = bytes[0] % (i + 1)
        ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    return chars.join('')
}

export function CreateAccountClient() {
    const [tab, setTab] = useState<AccountTab>('student')
    const [students, setStudents] = useState<StudentAccount[]>([])
    const [mentors, setMentors] = useState<MentorAccount[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
    const [password, setPassword] = useState('')
    const [reloadToken, setReloadToken] = useState(0)

    useEffect(() => {
        const client = createClient()
        let cancelled = false

        async function loadStudents() {
            const { data, error } = await client
                .from('profiles')
                .select('id, full_name, email, credits, updated_at')
                .eq('role', 'student')
                .order('updated_at', { ascending: false })

            if (cancelled || error || !data) return
            let filtered = data as StudentAccount[]
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                filtered = filtered.filter(
                    (student) =>
                        student.full_name?.toLowerCase().includes(term) ||
                        student.email?.toLowerCase().includes(term)
                )
            }
            setStudents(filtered)
        }

        async function loadMentors() {
            const { data, error } = await client
                .from('mentors')
                .select('id, status, updated_at, profile:profiles!left(full_name, email)')
                .order('updated_at', { ascending: false })

            if (cancelled || error || !data) return
            let mapped = data.map((row) => {
                const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile
                return {
                    id: row.id,
                    full_name: profile?.full_name ?? null,
                    email: profile?.email ?? null,
                    updated_at: row.updated_at,
                    status: row.status || 'details_required',
                }
            })
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                mapped = mapped.filter(
                    (mentor) =>
                        mentor.full_name?.toLowerCase().includes(term) ||
                        mentor.email?.toLowerCase().includes(term)
                )
            }
            setMentors(mapped)
        }

        async function load() {
            if (tab === 'student') {
                await loadStudents()
            } else {
                await loadMentors()
            }
            if (!cancelled) setIsLoading(false)
        }

        void load()
        return () => {
            cancelled = true
        }
    }, [searchTerm, tab, reloadToken])

    const openModal = () => {
        setMessage(null)
        setPassword('')
        setIsModalOpen(true)
    }

    const closeModal = () => {
        if (isPending) return
        setIsModalOpen(false)
        setMessage(null)
        setPassword('')
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setMessage(null)
        const formData = new FormData(e.currentTarget)
        formData.set('password', password)
        const creatingMentor = tab === 'mentor'

        startTransition(async () => {
            const result = creatingMentor
                ? await createMentorAccount(formData)
                : await createStudentAccount(formData)
            if ('success' in result && result.success) {
                setReloadToken((token) => token + 1)
                const roleLabel = creatingMentor ? 'Mentor' : 'Student'
                const parts: string[] = []
                if (result.emailSent) {
                    parts.push(`${roleLabel} account created. Welcome email sent with login details.`)
                } else {
                    parts.push(
                        `Account created, but the welcome email failed. Copy the password now and send it to the ${creatingMentor ? 'mentor' : 'student'} yourself.`
                    )
                }
                if (result.warning) {
                    parts.push(result.warning)
                }
                const text = parts.join(' ')
                if (result.emailSent && !result.warning) {
                    setMessage({ type: 'success', text })
                    setTimeout(() => {
                        setIsModalOpen(false)
                        setMessage(null)
                        setPassword('')
                    }, 2000)
                } else {
                    setMessage({ type: 'warning', text })
                }
            } else {
                setMessage({
                    type: 'error',
                    text: 'error' in result ? result.error : 'Failed to create account',
                })
            }
        })
    }

    const isMentorTab = tab === 'mentor'
    const empty = isMentorTab ? mentors.length === 0 : students.length === 0

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Account</h1>
                    <p className="text-gray-500 mt-1">
                        Provision student and mentor portal accounts and send branded login details.
                    </p>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                >
                    <Plus className="w-5 h-5" />
                    {isMentorTab ? 'Create Mentor' : 'Create Student'}
                </button>
            </header>

            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => {
                        if (isPending) return
                        setTab('student')
                        setIsLoading(true)
                        setIsModalOpen(false)
                        setMessage(null)
                        setPassword('')
                    }}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                        tab === 'student'
                            ? 'text-accent border-accent'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Students
                </button>
                <button
                    onClick={() => {
                        if (isPending) return
                        setTab('mentor')
                        setIsLoading(true)
                        setIsModalOpen(false)
                        setMessage(null)
                        setPassword('')
                    }}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                        tab === 'mentor'
                            ? 'text-accent border-accent'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                >
                    <GraduationCap className="w-4 h-4" />
                    Mentors
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLoading ? 'text-accent animate-pulse' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all shadow-inner"
                    />
                </div>
                <div className="text-sm text-gray-400 font-medium">
                    {isMentorTab
                        ? `${mentors.length} ${mentors.length === 1 ? 'Mentor' : 'Mentors'} found`
                        : `${students.length} ${students.length === 1 ? 'Student' : 'Students'} found`}
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                {isLoading && empty ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : empty ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Users className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {isMentorTab ? 'No mentor accounts yet' : 'No student accounts yet'}
                        </h3>
                        <p className="text-gray-500 max-w-sm">
                            {searchTerm
                                ? `No ${isMentorTab ? 'mentors' : 'students'} matching "${searchTerm}"`
                                : isMentorTab
                                  ? 'Create the first mentor account to send login details and the onboarding guide.'
                                  : 'Create the first student account to send login details and hours.'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={openModal}
                                className="mt-6 text-accent font-semibold hover:underline"
                            >
                                Create your first account
                            </button>
                        )}
                    </div>
                ) : isMentorTab ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Mentor</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Last updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {mentors.map((mentor) => (
                                    <tr key={mentor.id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                    {mentor.full_name?.[0] || 'M'}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-gray-900 truncate text-base">
                                                        {mentor.full_name || 'Unnamed mentor'}
                                                    </span>
                                                    <span className="text-sm text-gray-400 truncate flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        {mentor.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[mentor.status] || STATUS_COLORS.details_required}`}
                                            >
                                                {mentor.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-gray-500 font-medium">
                                            {format(new Date(mentor.updated_at), 'd MMM yyyy')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Hours</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Last updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {students.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                    {student.full_name?.[0] || 'S'}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-gray-900 truncate text-base">
                                                        {student.full_name || 'Unnamed student'}
                                                    </span>
                                                    <span className="text-sm text-gray-400 truncate flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        {student.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-semibold text-gray-700">
                                            {student.credits ?? 0}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-gray-500 font-medium">
                                            {format(new Date(student.updated_at), 'd MMM yyyy')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative border border-white/20 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={closeModal}
                            disabled={isPending}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-10">
                            <div className="mb-8">
                                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                                    <UserPlus className="w-7 h-7 text-accent" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {isMentorTab ? 'Create mentor account' : 'Create student account'}
                                </h2>
                                <p className="text-gray-500 mt-2">
                                    {isMentorTab
                                        ? 'A welcome email with login details and the mentor onboarding guide will be sent automatically.'
                                        : 'A welcome email with login details and the onboarding guide will be sent automatically.'}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="full_name">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            required
                                            id="full_name"
                                            name="full_name"
                                            type="text"
                                            minLength={2}
                                            maxLength={100}
                                            placeholder="Jane Doe"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="email">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            required
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="jane@example.com"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="password">
                                        Password
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                required
                                                id="password"
                                                name="password"
                                                type="text"
                                                autoComplete="new-password"
                                                minLength={12}
                                                maxLength={128}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="12+ characters"
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all font-mono text-sm"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPassword(generatePassword())}
                                            className="shrink-0 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 hover:bg-gray-100 transition-all flex items-center gap-2 text-sm font-semibold"
                                            title="Generate a 12-character password"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Generate
                                        </button>
                                    </div>
                                </div>

                                {!isMentorTab && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="total_hours">
                                            Total Hours
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                required
                                                id="total_hours"
                                                name="total_hours"
                                                type="number"
                                                min={0}
                                                max={1000}
                                                step={1}
                                                defaultValue={0}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {message && (
                                    <div
                                        className={`flex items-start gap-3 p-4 rounded-2xl animate-in slide-in-from-top-2 ${
                                            message.type === 'success'
                                                ? 'bg-green-50 text-green-700 border border-green-100'
                                                : message.type === 'warning'
                                                  ? 'bg-amber-50 text-amber-800 border border-amber-100'
                                                  : 'bg-red-50 text-red-700 border border-red-100'
                                        }`}
                                    >
                                        {message.type === 'success' ? (
                                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 shrink-0" />
                                        )}
                                        <span className="text-sm font-medium">{message.text}</span>
                                    </div>
                                )}

                                <button
                                    disabled={isPending}
                                    type="submit"
                                    className="w-full py-4 bg-accent text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
