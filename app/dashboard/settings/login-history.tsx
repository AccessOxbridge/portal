'use client'

import { useState } from 'react'
import { ShieldCheck, Monitor } from 'lucide-react'

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
        <section className="bg-white rounded-[28px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                    <h2 className="font-bold text-gray-900">Login History</h2>
                    <p className="text-sm text-gray-500">
                        {scope === 'all'
                            ? 'Recent sign-in attempts across all accounts'
                            : 'Recent sign-in attempts on your account'}
                    </p>
                </div>

                {isAdmin && (
                    <div className="ml-auto shrink-0 flex rounded-xl bg-gray-100 p-1">
                        {(['mine', 'all'] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setScope(value)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    scope === value
                                        ? 'bg-white text-accent shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {value === 'mine' ? 'Mine' : 'All users'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {rows.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-500 text-center">
                    No sign-ins recorded yet.
                </p>
            ) : (
                // Scrolls inside its own container so a long IP or agent string
                // never makes the settings page itself scroll sideways.
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="px-6 py-3 font-semibold whitespace-nowrap">Date &amp; Time</th>
                                {scope === 'all' && (
                                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Account</th>
                                )}
                                <th className="px-6 py-3 font-semibold whitespace-nowrap">Device</th>
                                <th className="px-6 py-3 font-semibold whitespace-nowrap">IP Address</th>
                                <th className="px-6 py-3 font-semibold whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map((event) => (
                                <tr key={event.id}>
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                        {formatWhen(event.created_at, timezone)}
                                    </td>
                                    {scope === 'all' && (
                                        <td className="px-6 py-4 text-gray-600 max-w-[220px] truncate">
                                            {event.email || '—'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-2">
                                            <Monitor className="w-4 h-4 text-gray-400 shrink-0" />
                                            {formatDevice(event.user_agent)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                                        {event.ip || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex px-3 py-1 rounded-lg text-xs font-medium ${
                                                event.status === 'success'
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-red-50 text-red-700'
                                            }`}
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

            <p className="px-6 py-4 border-t border-gray-100 text-xs text-gray-400">
                Sign-in records are kept for 90 days. If you see activity you don&apos;t recognise,
                change your password and contact support.
            </p>
        </section>
    )
}
