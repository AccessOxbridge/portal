'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Calendar, Clock, CalendarPlus } from 'lucide-react'
import { addMinutesToWallTime, getZonedNow, resolveTz, zonedTimeToUtcISO } from '@/lib/timezone'

export interface AssignedPair {
    studentId: string
    studentName: string
    mentorId: string
    mentorName: string
    mentorTimezone: string | null
}

// Common IANA timezones, plus whatever the selected pair's mentor already has.
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

const durationLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} mins`
    if (minutes === 60) return '1 hr'
    if (minutes % 60 === 0) return `${minutes / 60} hrs`
    return `${(minutes / 60).toFixed(1)} hrs`
}

export default function AdminBookSessionModal({ assignedPairs }: { assignedPairs: AssignedPair[] }) {
    const router = useRouter()

    const [isOpen, setIsOpen] = useState(false)
    const [pairKey, setPairKey] = useState('')
    const [timezone, setTimezone] = useState(resolveTz(null))
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const selectedPair = useMemo(
        () => assignedPairs.find((p) => `${p.studentId}:${p.mentorId}` === pairKey) || null,
        [assignedPairs, pairKey]
    )

    const tz = resolveTz(timezone)

    const resetForm = () => {
        setPairKey('')
        setTimezone(resolveTz(null))
        setDate(getZonedNow(resolveTz(null)).date)
        setStartTime('')
        setEndTime('')
        setError(null)
        setLoading(false)
    }

    const openModal = () => {
        resetForm()
        setIsOpen(true)
    }

    const closeModal = () => {
        setIsOpen(false)
    }

    // Default the timezone selector to the selected pair's mentor timezone.
    useEffect(() => {
        if (selectedPair?.mentorTimezone) {
            setTimezone(resolveTz(selectedPair.mentorTimezone))
        }
    }, [selectedPair])

    useEffect(() => {
        if (!isOpen) return
        setDate((prev) => prev || getZonedNow(tz).date)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    // Default end time to +60 minutes whenever the start time changes.
    useEffect(() => {
        if (!startTime) return
        setEndTime(addMinutesToWallTime(startTime, 60))
    }, [startTime, date])

    const handleSubmit = async () => {
        setError(null)

        if (!selectedPair) {
            setError('Please select a student.')
            return
        }
        if (!date || !startTime || !endTime) {
            setError('Please choose a date, start time and end time.')
            return
        }

        const startISO = zonedTimeToUtcISO(date, startTime, tz)
        let endISO = zonedTimeToUtcISO(date, endTime, tz)

        // Handle the end time crossing midnight (e.g. 23:00 -> 00:00).
        if (new Date(endISO) <= new Date(startISO)) {
            const nextDay = new Date(`${date}T00:00:00Z`)
            nextDay.setUTCDate(nextDay.getUTCDate() + 1)
            endISO = zonedTimeToUtcISO(nextDay.toISOString().split('T')[0], endTime, tz)
        }

        if (new Date(endISO) <= new Date(startISO)) {
            setError('End time must be after start time.')
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/admin/sessions/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selectedPair.studentId,
                    mentorId: selectedPair.mentorId,
                    timeSlot: { date, startTime: startISO, endTime: endISO },
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to book session.')
            }

            router.refresh()
            closeModal()
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={openModal}
                className="bg-accent text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-2 shrink-0"
            >
                <CalendarPlus className="w-4 h-4" />
                Book a Session
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

                    <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-extrabold text-gray-900">Book a Session</h2>
                                <p className="text-gray-500 mt-1">Directly confirm a session between an assigned mentor and student</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                                        <Calendar className="w-4 h-4 text-accent" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            This immediately creates a confirmed session — no accept/decline step for either party.
                                            Both will receive the standard session-confirmed email.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">Student</label>
                                <select
                                    value={pairKey}
                                    onChange={(e) => setPairKey(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                                >
                                    <option value="">Select a student</option>
                                    {assignedPairs.map((p) => (
                                        <option key={`${p.studentId}:${p.mentorId}`} value={`${p.studentId}:${p.mentorId}`}>
                                            {p.studentName} — assigned to {p.mentorName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedPair && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Mentor</label>
                                    <div className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700">
                                        {selectedPair.mentorName}
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Timezone</label>
                                    <select
                                        value={tz}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                                    >
                                        {getTimezoneOptions(selectedPair?.mentorTimezone ?? null).map((z) => (
                                            <option key={z} value={z}>{z}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Date</label>
                                        <input
                                            type="date"
                                            value={date}
                                            min={getZonedNow(tz).date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Start Time</label>
                                        <select
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                                        >
                                            <option value="">Select start time</option>
                                            {(() => {
                                                const nodes: any[] = []
                                                for (let h = 6; h <= 23; h++) {
                                                    for (let m = 0; m < 60; m += 15) {
                                                        const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                                                        nodes.push(<option key={value} value={value}>{value}</option>)
                                                    }
                                                }
                                                return nodes
                                            })()}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5">End Time</label>
                                        {startTime ? (
                                            <select
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                                            >
                                                <option value="">Select end time / duration</option>
                                                {[60, 120].map((d) => {
                                                    const value = addMinutesToWallTime(startTime, d)
                                                    return (
                                                        <option key={value} value={value}>
                                                            {value} ({durationLabel(d)})
                                                        </option>
                                                    )
                                                })}
                                            </select>
                                        ) : (
                                            <select disabled className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-400">
                                                <option>Select start time first</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="flex-1 text-red-700 text-sm leading-6">{error}</p>
                                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 p-1 flex items-center justify-center">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !selectedPair || !date || !startTime || !endTime}
                                className="bg-accent text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 inline-flex items-center gap-2"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Booking...
                                    </span>
                                ) : (
                                    <>
                                        <Clock className="w-4 h-4" />
                                        Book Session
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
