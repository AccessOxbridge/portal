'use client'

import { useState, useTransition } from 'react'
import { User, Mail, Shield, CalendarDays, Globe, KeyRound, Check, AlertCircle, Loader2 } from 'lucide-react'
import { updateTimezone, sendPasswordResetLink } from './actions'

interface SettingsContentProps {
    email: string
    fullName: string
    role: string
    createdAt?: string
    timezone: string | null
}

// Common IANA timezones, plus whatever the user already has saved.
const COMMON_TIMEZONES = [
    'Europe/London',
    'Europe/Dublin',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Athens',
    'Africa/Lagos',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Asia/Dubai',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Dhaka',
    'Asia/Singapore',
    'Asia/Hong_Kong',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Australia/Sydney',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Sao_Paulo',
]

function getTimezoneOptions(current: string | null): string[] {
    let list = COMMON_TIMEZONES
    // Prefer the full browser-provided list when available (modern browsers).
    try {
        const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
            .supportedValuesOf?.('timeZone')
        if (supported && supported.length) list = supported
    } catch {
        // fall back to COMMON_TIMEZONES
    }
    if (current && !list.includes(current)) {
        return [current, ...list]
    }
    return list
}

const roleLabel = (role: string) => {
    switch (role) {
        case 'admin-dev': return 'Admin (Dev)'
        case 'admin': return 'Admin'
        case 'mentor': return 'Mentor'
        case 'student': return 'Student'
        default: return role
    }
}

export default function SettingsContent({ email, fullName, role, createdAt, timezone }: SettingsContentProps) {
    const browserTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''
    const [tz, setTz] = useState(timezone || browserTz || '')
    const [savedTz, setSavedTz] = useState(timezone || '')
    const [tzFeedback, setTzFeedback] = useState<{ ok: boolean; message: string } | null>(null)
    const [tzPending, startTzTransition] = useTransition()

    const [pwFeedback, setPwFeedback] = useState<{ ok: boolean; message: string } | null>(null)
    const [pwPending, startPwTransition] = useTransition()

    const tzOptions = getTimezoneOptions(savedTz || tz)

    const handleSaveTimezone = () => {
        setTzFeedback(null)
        startTzTransition(async () => {
            const result = await updateTimezone(tz)
            setTzFeedback(result)
            if (result.ok) setSavedTz(tz)
        })
    }

    const handleSendResetLink = () => {
        setPwFeedback(null)
        startPwTransition(async () => {
            const result = await sendPasswordResetLink()
            setPwFeedback(result)
        })
    }

    const accountRows = [
        { icon: User, label: 'Name', value: fullName },
        { icon: Mail, label: 'Email', value: email },
        { icon: Shield, label: 'Role', value: roleLabel(role) },
        ...(createdAt
            ? [{
                icon: CalendarDays,
                label: 'Member since',
                value: new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            }]
            : []),
    ]

    return (
        <div className="max-w-3xl space-y-8">
            <div>
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">Settings</h1>
                <p className="mt-2 text-gray-500 text-lg">Manage your account, timezone and password.</p>
            </div>

            {/* Account info (read-only) */}
            <section className="bg-white rounded-[28px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">Account</h2>
                        <p className="text-sm text-gray-500">Your account details</p>
                    </div>
                </div>
                <dl className="divide-y divide-gray-100">
                    {accountRows.map(({ icon: Icon, label, value }) => (
                        <div key={label} className="px-6 py-4 flex items-center gap-4">
                            <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                            <dt className="text-sm text-gray-500 w-32 shrink-0">{label}</dt>
                            <dd className="text-sm font-semibold text-gray-900 truncate">{value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Timezone */}
            <section className="bg-white rounded-[28px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">Timezone</h2>
                        <p className="text-sm text-gray-500">Used for scheduling and displaying session times</p>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <select
                        value={tz}
                        onChange={(e) => { setTz(e.target.value); setTzFeedback(null) }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all bg-white"
                    >
                        {tz === '' && <option value="">Select your timezone…</option>}
                        {tzOptions.map((option) => (
                            <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
                        ))}
                    </select>

                    {tzFeedback && (
                        <div className={`flex items-center gap-2 text-sm ${tzFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                            {tzFeedback.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            <span>{tzFeedback.message}</span>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleSaveTimezone}
                            disabled={tzPending || tz === savedTz || tz === ''}
                            className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {tzPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save timezone
                        </button>
                    </div>
                </div>
            </section>

            {/* Password */}
            <section className="bg-white rounded-[28px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">Password</h2>
                        <p className="text-sm text-gray-500">Change your password via a secure email link</p>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        We'll email a password reset link to <span className="font-semibold text-gray-900">{email}</span>.
                        Open it and choose a new password — the link expires for your security.
                    </p>

                    {pwFeedback && (
                        <div className={`flex items-start gap-2 text-sm rounded-xl p-3 ${pwFeedback.ok ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-700 bg-red-50 border border-red-200'}`}>
                            {pwFeedback.ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                            <span>{pwFeedback.message}</span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSendResetLink}
                        disabled={pwPending}
                        className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {pwPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        Send password reset link
                    </button>
                </div>
            </section>
        </div>
    )
}
