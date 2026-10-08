'use client'

import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import {
    WarningCircle as AlertCircle,
    BookOpen,
    CheckCircle as CheckCircle2,
    Clock,
    GraduationCap,
    Key as KeyRound,
    CircleNotch as Loader2,
    Envelope as Mail,
    Plus,
    ArrowClockwise as RefreshCw,
    MagnifyingGlass as Search,
    User,
    UserPlus,
    Users,
    X,
} from '@phosphor-icons/react/ssr'
import { useEffect, useState, useTransition } from 'react'
import { createMentorAccount, createStudentAccount } from './actions'
import { AdjustCreditsCell } from '@/components/admin/adjust-credits-cell'
import { SessionTargetFields, todayIso, type TargetDraft } from '@/components/admin/session-target-fields'

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
    active: 'bg-tint-green text-tint-green-foreground border-border',
    pending_approval: 'bg-tint-amber text-tint-amber-foreground border-border',
    details_required: 'bg-muted/60 text-foreground border-border',
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
    const [hours, setHours] = useState('0')
    const [target, setTarget] = useState<TargetDraft>(() => ({
        planType: 'package',
        sessions: '',
        weeks: '',
        startDate: todayIso(),
    }))

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
        setHours('0')
        setTarget({ planType: 'package', sessions: '', weeks: '', startDate: todayIso() })
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
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Create account</h1>
                    <p className="text-muted-foreground mt-1">
                        Provision student and mentor portal accounts and send branded login details.
                    </p>
                </div>
                <button
                    onClick={openModal}
                    className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                >
                    <Plus className="size-5" />
                    {isMentorTab ? 'Create mentor' : 'Create student'}
                </button>
            </header>

            <div className="flex gap-2 border-b border-border">
                <button
                    onClick={() => {
                        if (isPending) return
                        setTab('student')
                        setIsLoading(true)
                        setIsModalOpen(false)
                        setMessage(null)
                        setPassword('')
                    }}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${
                        tab === 'student'
                            ? 'text-primary border-primary'
                            : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                >
                    <BookOpen className="size-4" />
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
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${
                        tab === 'mentor'
                            ? 'text-primary border-primary'
                            : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                >
                    <GraduationCap className="size-4" />
                    Mentors
                </button>
            </div>

            <div className="border border-transparent flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-card shadow-border">
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${isLoading ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-10"
                    />
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                    {isMentorTab
                        ? `${mentors.length} ${mentors.length === 1 ? 'Mentor' : 'Mentors'} found`
                        : `${students.length} ${students.length === 1 ? 'Student' : 'Students'} found`}
                </div>
            </div>

            <div className="border border-transparent bg-card rounded-card overflow-hidden shadow-border">
                {isLoading && empty ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="size-8 text-primary animate-spin" />
                    </div>
                ) : empty ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="size-20 bg-muted/60 rounded-full flex items-center justify-center mb-6">
                            <Users className="size-10 text-muted-foreground/60" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            {isMentorTab ? 'No mentor accounts yet' : 'No student accounts yet'}
                        </h3>
                        <p className="text-muted-foreground max-w-sm">
                            {searchTerm
                                ? `No ${isMentorTab ? 'mentors' : 'students'} matching "${searchTerm}"`
                                : isMentorTab
                                  ? 'Create the first mentor account to send login details and the onboarding guide.'
                                  : 'Create the first student account to send login details and hours.'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={openModal}
                                className="mt-6 text-primary font-semibold hover:underline"
                            >
                                Create your first account
                            </button>
                        )}
                    </div>
                ) : isMentorTab ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/60 border-b border-border">
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground">Mentor</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground">Status</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground">Last updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {mentors.map((mentor) => (
                                    <tr key={mentor.id} className="hover:bg-muted/60 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-card bg-tint-green text-tint-green-foreground flex items-center justify-center font-semibold text-lg shrink-0 shadow-border group-hover:scale-105 transition-transform">
                                                    {mentor.full_name?.[0] || 'M'}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-foreground truncate text-base">
                                                        {mentor.full_name || 'Unnamed mentor'}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                                                        <Mail className="size-3.5" />
                                                        {mentor.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[mentor.status] || STATUS_COLORS.details_required}`}
                                            >
                                                {mentor.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-muted-foreground font-medium">
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
                                <tr className="bg-muted/60 border-b border-border">
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground">Student</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground">Hours</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground">Last updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {students.map((student) => (
                                    <tr key={student.id} className="hover:bg-muted/60 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-card bg-tint-blue text-tint-blue-foreground flex items-center justify-center font-semibold text-lg shrink-0 shadow-border group-hover:scale-105 transition-transform">
                                                    {student.full_name?.[0] || 'S'}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-foreground truncate text-base">
                                                        {student.full_name || 'Unnamed student'}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                                                        <Mail className="size-3.5" />
                                                        {student.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <AdjustCreditsCell
                                                studentId={student.id}
                                                studentName={student.full_name || 'Student'}
                                                studentEmail={student.email}
                                                credits={student.credits ?? 0}
                                            />
                                        </td>
                                        <td className="px-8 py-5 text-sm text-muted-foreground font-medium">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in-0 duration-200 motion-reduce:animate-none">
                    <div className="relative w-full max-w-md overflow-hidden rounded-sheet border border-transparent bg-card shadow-overlay animate-in fade-in-0 zoom-in-96 duration-200 ease-snappy motion-reduce:animate-none max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={closeModal}
                            disabled={isPending}
                            className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-full transition-[background-color,box-shadow,color] duration-150 disabled:opacity-50"
                        >
                            <X className="size-5" />
                        </button>

                        <div className="p-10">
                            <div className="mb-8">
                                <div className="size-14 bg-primary/10 rounded-card flex items-center justify-center mb-6">
                                    <UserPlus className="size-7 text-primary" />
                                </div>
                                <h2 className="text-2xl font-semibold text-foreground">
                                    {isMentorTab ? 'Create mentor account' : 'Create student account'}
                                </h2>
                                <p className="text-muted-foreground mt-2">
                                    {isMentorTab
                                        ? 'A welcome email with login details and the mentor onboarding guide will be sent automatically.'
                                        : 'A welcome email with login details and the onboarding guide will be sent automatically.'}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground ml-1" htmlFor="full_name">
                                        Full name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <input
                                            required
                                            id="full_name"
                                            name="full_name"
                                            type="text"
                                            minLength={2}
                                            maxLength={100}
                                            placeholder="Jane Doe"
                                            className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground ml-1" htmlFor="email">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <input
                                            required
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="jane@example.com"
                                            className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground ml-1" htmlFor="password">
                                        Password
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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
                                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-11 font-mono"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPassword(generatePassword())}
                                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 border border-transparent bg-card text-foreground shadow-border hover:bg-muted h-11 px-5 text-base in-data-[density=compact]:h-9 in-data-[density=compact]:px-4 in-data-[density=compact]:text-sm"
                                            title="Generate a 12-character password"
                                        >
                                            <RefreshCw className="size-4" />
                                            Generate
                                        </button>
                                    </div>
                                </div>

                                {!isMentorTab && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-foreground ml-1" htmlFor="total_hours">
                                            Total hours
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input
                                                required
                                                id="total_hours"
                                                name="total_hours"
                                                type="number"
                                                min={0}
                                                max={1000}
                                                step={1}
                                                value={hours}
                                                onChange={(e) => setHours(e.target.value)}
                                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-11"
                                            />
                                        </div>
                                    </div>
                                )}

                                {!isMentorTab && (
                                    <div className="space-y-3 pt-2 border-t border-border">
                                        <div className="ml-1 pt-4">
                                            <p className="text-sm font-semibold text-foreground">Session plan</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Optional. Used to flag the student on the Performance page if they
                                                fall behind. Leave weeks blank to skip.
                                            </p>
                                        </div>
                                        <SessionTargetFields
                                            value={{
                                                ...target,
                                                // A package is the hours bought; ongoing is set by hand.
                                                sessions: target.planType === 'package' ? hours : target.sessions,
                                            }}
                                            onChange={(next) =>
                                                setTarget(
                                                    next.planType !== target.planType
                                                        ? { ...next, sessions: '' }
                                                        : next
                                                )
                                            }
                                            sessionsLocked
                                            weeksRequired={false}
                                        />
                                    </div>
                                )}

                                {message && (
                                    <div
                                        className={`flex items-start gap-3 p-4 rounded-card ${
                                            message.type === 'success'
                                                ? 'bg-tint-green text-tint-green-foreground border border-border'
                                                : message.type === 'warning'
                                                  ? 'bg-tint-amber text-tint-amber-foreground border border-border'
                                                  : 'bg-tint-rose text-tint-rose-foreground border border-border'
                                        }`}
                                    >
                                        {message.type === 'success' ? (
                                            <CheckCircle2 className="size-5 shrink-0" />
                                        ) : (
                                            <AlertCircle className="size-5 shrink-0" />
                                        )}
                                        <span className="text-sm font-medium">{message.text}</span>
                                    </div>
                                )}

                                <button
                                    disabled={isPending}
                                    type="submit"
                                    className="w-full py-4 bg-primary text-white rounded-card font-semibold text-lg hover:opacity-90 transition-[background-color,box-shadow,color] duration-150 shadow-border shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {isPending ? <Loader2 className="size-5 animate-spin" /> : 'Create account'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
