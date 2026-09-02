'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Calendar, Clock } from 'lucide-react'
import { addMinutesToWallTime, getZonedNow, resolveTz, zonedTimeToUtcISO } from '@/lib/timezone'
import DatePicker from '@/components/dashboard/date-picker'
import SelectMenu from '@/components/dashboard/select-menu'

export interface MentorRequestStudentOption {
    id: string
    full_name: string
}

interface MentorRequestSessionModalProps {
    isOpen: boolean
    onClose: () => void
    students: MentorRequestStudentOption[]
    preselectedStudentId?: string
    mentorTimezone?: string | null
    /**
     * Fired only when a request was actually sent, just before `onClose`.
     * `onClose` alone cannot tell "sent" from "cancelled", and the post-session
     * check-in popup needs the difference to mark the booking question answered.
     */
    onSubmitted?: () => void
}

export default function MentorRequestSessionModal({
    isOpen,
    onClose,
    students,
    preselectedStudentId,
    mentorTimezone,
    onSubmitted
}: MentorRequestSessionModalProps) {
    const router = useRouter()
    const tz = resolveTz(mentorTimezone)
    const todayDate = getZonedNow(tz).date

    const [studentId, setStudentId] = useState(preselectedStudentId || '')
    const [date, setDate] = useState(todayDate)
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) {
            setStudentId(preselectedStudentId || '')
            setDate(getZonedNow(tz).date)
            setStartTime('')
            setEndTime('')
            setNote('')
            setError(null)
            setLoading(false)
        } else {
            setStudentId(preselectedStudentId || '')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, preselectedStudentId])

    // Default end time to +60 minutes whenever the start time changes.
    useEffect(() => {
        if (!startTime) return
        setEndTime(addMinutesToWallTime(startTime, 60))
    }, [startTime, date])

    const startTimeOptions = (() => {
        const options: string[] = []
        const nowMins =
            date === todayDate
                ? (() => {
                    const [nowH, nowM] = getZonedNow(tz).time.split(':').map(Number)
                    return nowH * 60 + nowM
                })()
                : -1

        for (let h = 6; h <= 23; h++) {
            for (const m of [0, 15, 30, 45]) {
                const total = h * 60 + m
                if (nowMins >= 0 && total <= nowMins) continue
                options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
            }
        }
        return options
    })()

    useEffect(() => {
        if (date !== todayDate) return
        if (startTime && startTimeOptions.includes(startTime)) return
        setStartTime(startTimeOptions[0] || '')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, startTime, todayDate, tz])

    const durationLabel = (minutes: number) => {
        if (minutes < 60) return `${minutes} mins`
        if (minutes === 60) return '1 hr'
        if (minutes % 60 === 0) return `${minutes / 60} hrs`
        return `${(minutes / 60).toFixed(1)} hrs`
    }

    const handleSubmit = async () => {
        setError(null)

        if (!studentId) {
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
            const response = await fetch('/api/mentor/request-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    timeSlot: { date, startTime: startISO, endTime: endISO },
                    note: note.trim() || undefined,
                    timezone: tz,
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send session request.')
            }

            router.refresh()
            onSubmitted?.()
            onClose()
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-xl sm:mx-4 max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900">Request a Session</h2>
                        <p className="text-gray-500 mt-1">Propose a time for your student to confirm</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                                <Calendar className="w-4 h-4 text-accent" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    Choose a student and propose one time. They&apos;ll be able to accept or decline it from their Pending tab.
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Timezone: <strong>{tz}</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    {!preselectedStudentId && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Student</label>
                            <SelectMenu
                                value={studentId}
                                onChange={setStudentId}
                                placeholder="Select a student"
                                options={students.map((s) => ({ value: s.id, label: s.full_name }))}
                                maxHeight={200}
                            />
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Date</label>
                            <DatePicker
                                value={date}
                                min={todayDate}
                                onChange={setDate}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">Start Time</label>
                                <SelectMenu
                                    value={startTime}
                                    onChange={setStartTime}
                                    options={startTimeOptions.map((value) => ({ value, label: value }))}
                                    placeholder="Select start time"
                                    maxHeight={200}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">End Time</label>
                                <SelectMenu
                                    value={endTime}
                                    onChange={setEndTime}
                                    disabled={!startTime}
                                    placeholder={startTime ? 'Select end time / duration' : 'Select start time first'}
                                    options={
                                        startTime
                                            ? [60, 120].map((d) => {
                                                const value = addMinutesToWallTime(startTime, d)
                                                return {
                                                    value,
                                                    label: `${value} (${durationLabel(d)})`,
                                                }
                                            })
                                            : []
                                    }
                                    maxHeight={160}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Message (optional)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            placeholder="Let them know what you'd like to cover, or why you're proposing this time…"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm resize-none"
                        />
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

                <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !studentId || !date || !startTime || !endTime}
                        className="bg-accent text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 inline-flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending...
                            </span>
                        ) : (
                            <>
                                <Clock className="w-4 h-4" />
                                Send Request
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
