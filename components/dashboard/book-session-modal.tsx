'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, Plus } from 'lucide-react'
import { addMinutesToWallTime, getZonedNow, resolveTz, zonedTimeToUtcISO } from '@/lib/timezone'
import DatePicker from '@/components/dashboard/date-picker'
import SelectMenu from '@/components/dashboard/select-menu'

interface TimeSlot {
    date: string
    startTime: string
    endTime: string
}

export interface StudentBookingProfile {
    school_name: string
    school_country: string
    curriculum: string
    curriculum_other?: string
    subjects: { name: string; predicted_grade: string }[]
    target_university: string
    timezone: string
    interests: string
    extracurriculars: string
    additional_notes?: string
}

interface BookSessionModalProps {
    isOpen: boolean
    onClose: () => void
    studentProfile: StudentBookingProfile
    /** The student's currently assigned mentors. When there's more than one, the student picks who to book with. */
    mentors: { id: string; name: string }[]
}

export default function BookSessionModal({ isOpen, onClose, studentProfile, mentors }: BookSessionModalProps) {
    const router = useRouter()
    // All wall-clock times in this modal are interpreted in the student's
    // timezone (not the browser's), so the label and the saved times agree.
    const tz = resolveTz(studentProfile.timezone)
    const todayDate = getZonedNow(tz).date

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [mentorId, setMentorId] = useState<string>(mentors.length === 1 ? mentors[0].id : '')
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
    const [date, setDate] = useState(todayDate)
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')

    // Reset form state when the modal closes
    useEffect(() => {
        if (!isOpen) {
            setTimeSlots([])
            setDate(getZonedNow(tz).date)
            setStartTime('')
            setEndTime('')
            setError(null)
            setLoading(false)
            setMentorId(mentors.length === 1 ? mentors[0].id : '')
        }
    }, [isOpen, tz, mentors])

    // When startTime changes, always default endTime to +60 minutes (1 hr)
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
                // On today, only show times that haven't started yet
                if (nowMins >= 0 && total <= nowMins) continue
                options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
            }
        }
        return options
    })()

    // Default to the next available slot on today, or clear a past selection
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

    const formatSlotDisplay = (slot: TimeSlot) => {
        const start = new Date(slot.startTime)
        const end = new Date(slot.endTime)

        const dateStr = start.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: tz,
        })
        const startTimeStr = start.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: tz,
        })
        const endTimeStr = end.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: tz,
        })

        return `${dateStr}, ${startTimeStr} - ${endTimeStr}`
    }

    const addTimeSlot = () => {
        setError(null)

        if (!date || !startTime || !endTime) {
            setError('Please choose a date, start time and end time.')
            return
        }

        const startISO = zonedTimeToUtcISO(date, startTime, tz)
        let endISO = zonedTimeToUtcISO(date, endTime, tz)

        // If the selected end time appears before or equal to the start time
        // (e.g. 23:00 → 00:00), treat it as crossing midnight into the next day.
        if (new Date(endISO) <= new Date(startISO)) {
            const nextDay = new Date(`${date}T00:00:00Z`)
            nextDay.setUTCDate(nextDay.getUTCDate() + 1)
            endISO = zonedTimeToUtcISO(nextDay.toISOString().split('T')[0], endTime, tz)
        }

        const startDateTime = new Date(startISO)
        const endDateTime = new Date(endISO)

        if (endDateTime <= startDateTime) {
            setError('End time must be after start time.')
            return
        }

        const duplicate = timeSlots.some((s) => s.startTime === startISO && s.endTime === endISO)
        if (duplicate) {
            setError('This exact time slot has already been added')
            return
        }

        const overlap = timeSlots.find((s) => {
            const existingStart = new Date(s.startTime)
            const existingEnd = new Date(s.endTime)
            return startDateTime < existingEnd && endDateTime > existingStart
        })
        if (overlap) {
            setError(`This slot overlaps an existing slot: ${formatSlotDisplay(overlap)}. Please choose a different time.`)
            return
        }

        setTimeSlots((prev) => [...prev, { date, startTime: startISO, endTime: endISO }])
        // Keep the date; clear start so the next slot is easy to pick
        setStartTime('')
        setEndTime('')
    }

    const removeTimeSlot = (index: number) => {
        setTimeSlots((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        setError(null)

        if (mentors.length > 1 && !mentorId) {
            setError('Please choose which mentor to book this session with')
            return
        }

        if (timeSlots.length < 3) {
            setError('Please add at least 3 time slots so your mentor can pick one that works')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/student/book-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mentorId: mentorId || mentors[0]?.id,
                    schoolName: studentProfile.school_name,
                    schoolCountry: studentProfile.school_country,
                    curriculum: studentProfile.curriculum,
                    curriculumOther: studentProfile.curriculum_other,
                    subjects: studentProfile.subjects,
                    targetUniversities: [studentProfile.target_university],
                    timezone: studentProfile.timezone,
                    timeSlots,
                    academicInterests: studentProfile.interests,
                    extracurriculars: studentProfile.extracurriculars,
                    anythingElse: studentProfile.additional_notes
                })
            })

            const result = await response.json()

            if (!response.ok) {
                if (response.status === 402) {
                    setError(result.error || 'Insufficient credits to complete this booking.')
                    return
                }
                throw new Error(result.error || 'Failed to submit booking request.')
            }

            router.refresh()
            router.push('/dashboard/student/sessions')
            onClose()
        } catch (err: any) {
            console.error('Booking failed:', err)
            setError(err.message || 'An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const canSubmit =
        !loading &&
        timeSlots.length >= 3 &&
        !(mentors.length > 1 && !mentorId)

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-xl sm:mx-4 max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900">Book a Session</h2>
                        <p className="text-gray-500 mt-1">Add at least 3 times for your mentor to choose from</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                    {mentors.length > 1 ? (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Book with</label>
                            <select
                                value={mentorId}
                                onChange={(e) => setMentorId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                            >
                                <option value="">Select a mentor</option>
                                {mentors.map((mentor) => (
                                    <option key={mentor.id} value={mentor.id}>
                                        {mentor.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : mentors.length === 1 ? (
                        <p className="text-sm text-gray-500">
                            With <span className="font-semibold text-gray-800">{mentors[0].name}</span>
                        </p>
                    ) : null}

                    {timeSlots.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">Added slots</span>
                                <span className={`text-sm font-medium ${timeSlots.length >= 3 ? 'text-green-600' : 'text-amber-600'}`}>
                                    {timeSlots.length >= 3 ? `✓ ${timeSlots.length} slots` : `${timeSlots.length}/3 minimum`}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {timeSlots.map((slot, index) => (
                                    <div
                                        key={`${slot.startTime}-${slot.endTime}`}
                                        className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-xl font-medium text-sm"
                                    >
                                        <Clock className="w-4 h-4 shrink-0" />
                                        <span>{formatSlotDisplay(slot)}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeTimeSlot(index)}
                                            className="hover:bg-accent/20 rounded-full p-1 transition-colors"
                                            aria-label="Remove time slot"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
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
                        <p className="text-xs text-gray-500">
                            Times shown in <strong>{tz}</strong>
                        </p>
                        <button
                            type="button"
                            onClick={addTimeSlot}
                            disabled={!date || !startTime || !endTime}
                            className="w-full py-3 bg-accent/10 text-accent font-bold rounded-xl hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add Time Slot
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-red-700 text-sm leading-6">{error}</p>
                                {error.toLowerCase().includes('credits') && (
                                    <button
                                        onClick={() => router.push('/dashboard/student/services')}
                                        className="mt-2 px-4 py-1.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
                                    >
                                        Get More Credits
                                    </button>
                                )}
                            </div>
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
                        disabled={!canSubmit}
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
