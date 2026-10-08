'use client'

import { useState } from 'react'
import { ShieldCheck, Monitor } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { segmentClass, segmentTrack } from '@/components/ui/segmented'

export interface LoginEvent {
    id: string
    created_at: string
    ip: string | null
    user_agent: string | null
    status: string
    email?: string | null
}

interface LoginHistoryProps {
    events: LoginEvent[]
    /** Every user's events — admins only; null for everyone else. */
    allEvents: LoginEvent[] | null
    /** The viewer's saved timezone, so times read in their own day. */
    timezone: string | null
}

/**
 * en-GB, and in the user's own timezone rather than the server's. A sign-in
 * history exists to let someone recognise their own activity, which they cannot
 * do if the clock is UTC and the date is month-first.
 */
function formatWhen(iso: string, timezone: string | null): string {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            ...(timezone ? { timeZone: timezone } : {}),
        }).format(new Date(iso))
    } catch {
        // An invalid saved timezone must not take the whole tile down.
        return new Date(iso).toISOString().slice(0, 16).replace('T', ', ')
    }
}

/**
 * Browser and OS out of the user-agent. Deliberately coarse: "Chrome on
 * Windows" is what makes a row recognisable, and an IP on its own is not —
 * a phone's address changes constantly and looks alarming when it does.
 */
function formatDevice(ua: string | null): string {
    if (!ua) return 'Unknown device'

    const browser =
        /edg\//i.test(ua) ? 'Edge'
        : /opr\/|opera/i.test(ua) ? 'Opera'
        : /chrome|crios/i.test(ua) ? 'Chrome'
        : /firefox|fxios/i.test(ua) ? 'Firefox'
        : /safari/i.test(ua) ? 'Safari'
        : null

    const os =
        /iphone|ipad|ipod/i.test(ua) ? 'iOS'
        : /android/i.test(ua) ? 'Android'
        : /mac os x/i.test(ua) ? 'macOS'
        : /windows/i.test(ua) ? 'Windows'
        : /linux/i.test(ua) ? 'Linux'
        : null

    if (browser && os) return `${browser} on ${os}`
    return browser || os || 'Unknown device'
}

export default function LoginHistory({ events, allEvents, timezone }: LoginHistoryProps) {
    const [scope, setScope] = useState<'mine' | 'all'>('mine')
    const isAdmin = allEvents !== null
    const rows = scope === 'all' && allEvents ? allEvents : events

    return (
        <section className="overflow-hidden rounded-card border border-transparent bg-card shadow-border">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-green text-tint-green-foreground">
                    <ShieldCheck weight="duotone" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-foreground">Login history</h2>
                    <p className="text-sm text-muted-foreground">
                        {scope === 'all'
                            ? 'Recent sign-in attempts across all accounts'
                            : 'Recent sign-in attempts on your account'}
                    </p>
                </div>

                {isAdmin && (
                    <div className={cn(segmentTrack, 'w-fit')}>
                        {(['mine', 'all'] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setScope(value)}
                                aria-pressed={scope === value}
                                className={segmentClass(scope === value)}
                            >
                                {value === 'mine' ? 'Mine' : 'All users'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {rows.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No sign-ins recorded yet.
                </p>
            ) : (
                // Scrolls inside its own container so a long IP or agent string
                // never makes the settings page itself scroll sideways.
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                                <th className="whitespace-nowrap px-5 py-2.5 font-medium sm:px-6">Date and time</th>
                                {scope === 'all' && (
                                    <th className="whitespace-nowrap px-5 py-2.5 font-medium sm:px-6">Account</th>
                                )}
                                <th className="whitespace-nowrap px-5 py-2.5 font-medium sm:px-6">Device</th>
                                <th className="whitespace-nowrap px-5 py-2.5 font-medium sm:px-6">IP address</th>
                                <th className="whitespace-nowrap px-5 py-2.5 font-medium sm:px-6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rows.map((event) => (
                                <tr key={event.id}>
                                    <td className="whitespace-nowrap px-5 py-3 text-foreground tabular-nums sm:px-6">
                                        {formatWhen(event.created_at, timezone)}
                                    </td>
                                    {scope === 'all' && (
                                        <td className="max-w-[220px] truncate px-5 py-3 text-muted-foreground sm:px-6">
                                            {event.email || 'None'}
                                        </td>
                                    )}
                                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground sm:px-6">
                                        <span className="inline-flex items-center gap-2">
                                            <Monitor className="size-4 shrink-0" />
                                            {formatDevice(event.user_agent)}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground sm:px-6">
                                        {event.ip || 'Unknown'}
                                    </td>
                                    <td className="px-5 py-3 sm:px-6">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                                                event.status === 'success'
                                                    ? 'bg-tint-green text-tint-green-foreground'
                                                    : 'bg-tint-rose text-tint-rose-foreground',
                                            )}
                                        >
                                            {event.status === 'success' ? 'Success' : 'Failed'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="border-t border-border px-5 py-3.5 text-xs text-muted-foreground text-pretty sm:px-6">
                Sign-in records are kept for 90 days. If you see activity you don&apos;t recognise,
                change your password and contact support.
            </p>
        </section>
    )
}
