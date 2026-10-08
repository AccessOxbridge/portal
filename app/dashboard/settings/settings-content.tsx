'use client'

import { useState, useTransition } from 'react'
import { User, Envelope as Mail, Shield, CalendarDots as CalendarDays, Globe, Key as KeyRound, Check, WarningCircle as AlertCircle } from '@phosphor-icons/react/ssr'
import { updateTimezone, sendPasswordResetLink } from './actions'
import { getDefaultTimezone, rememberTimezone } from '@/lib/timezone'
import LoginHistory, { type LoginEvent } from './login-history'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/select'
import { cn } from '@/utils/lib'

interface SettingsContentProps {
    email: string
    fullName: string
    role: string
    createdAt?: string
    timezone: string | null
    loginEvents: LoginEvent[]
    /** Every user's events — admins only; null for everyone else. */
    allLoginEvents: LoginEvent[] | null
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

export default function SettingsContent({
    email,
    fullName,
    role,
    createdAt,
    timezone,
    loginEvents,
    allLoginEvents,
}: SettingsContentProps) {
    const [tz, setTz] = useState(timezone || getDefaultTimezone())
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
            if (result.ok) {
                setSavedTz(tz)
                rememberTimezone(tz)
            }
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
        <div className="mx-auto max-w-3xl space-y-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Settings</h1>
                <p className="mt-1 text-muted-foreground">Manage your account, timezone and password.</p>
            </header>

            {/* Account info (read-only) */}
            <section className={card}>
                <SectionHead icon={User} tint="bg-tint-blue text-tint-blue-foreground" title="Account" description="Your account details" />
                <dl className="divide-y divide-border">
                    {accountRows.map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                            <Icon className="size-4 shrink-0 text-muted-foreground" />
                            <dt className="w-28 shrink-0 text-sm text-muted-foreground sm:w-32">{label}</dt>
                            <dd className="min-w-0 truncate text-sm font-medium text-foreground">{value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Timezone */}
            <section className={card}>
                <SectionHead icon={Globe} tint="bg-tint-violet text-tint-violet-foreground" title="Timezone" description="Used for scheduling and displaying session times" />
                <div className="space-y-4 p-5 sm:p-6">
                    <SelectField
                        value={tz}
                        onChange={(e) => { setTz(e.target.value); setTzFeedback(null) }}
                        aria-label="Timezone"
                    >
                        {tz === '' && <option value="">Select your timezone…</option>}
                        {tzOptions.map((option) => (
                            <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
                        ))}
                    </SelectField>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {tzFeedback ? (
                            <p role="status" className={cn('flex items-center gap-2 text-sm', tzFeedback.ok ? 'text-success' : 'text-destructive')}>
                                {tzFeedback.ok ? <Check weight="bold" className="size-4" /> : <AlertCircle className="size-4" />}
                                <span>{tzFeedback.message}</span>
                            </p>
                        ) : <span />}
                        <Button
                            type="button"
                            onClick={handleSaveTimezone}
                            disabled={tzPending || tz === savedTz || tz === ''}
                            loading={tzPending}
                        >
                            Save timezone
                        </Button>
                    </div>
                </div>
            </section>

            {/* Password */}
            <section className={card}>
                <SectionHead icon={KeyRound} tint="bg-tint-amber text-tint-amber-foreground" title="Password" description="Change your password via a secure email link" />
                <div className="space-y-4 p-5 sm:p-6">
                    <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                        We&apos;ll email a password reset link to <span className="font-medium text-foreground [overflow-wrap:anywhere]">{email}</span>.
                        Open it and choose a new password. The link expires for your security.
                    </p>

                    {pwFeedback && (
                        <div
                            role="status"
                            className={cn(
                                'flex items-start gap-2 rounded-control px-3.5 py-3 text-sm ring-1',
                                pwFeedback.ok ? 'bg-tint-green text-tint-green-foreground ring-success/25' : 'bg-tint-rose text-tint-rose-foreground ring-destructive/20',
                            )}
                        >
                            {pwFeedback.ok ? <Check weight="bold" className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
                            <span>{pwFeedback.message}</span>
                        </div>
                    )}

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSendResetLink}
                        disabled={pwPending}
                        loading={pwPending}
                    >
                        {!pwPending && <KeyRound />}
                        Send password reset link
                    </Button>
                </div>
            </section>

            {/* Security */}
            <LoginHistory
                events={loginEvents}
                allEvents={allLoginEvents}
                timezone={timezone}
            />
        </div>
    )
}

const card = 'overflow-hidden rounded-card border border-transparent bg-card shadow-border'

function SectionHead({ icon: Icon, tint, title, description }: { icon: typeof User; tint: string; title: string; description: string }) {
    return (
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', tint)}>
                <Icon weight="duotone" className="size-5" />
            </span>
            <div className="min-w-0">
                <h2 className="font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    )
}
