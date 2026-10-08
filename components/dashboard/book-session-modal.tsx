'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, Plus, Check, WarningCircle, PaperPlaneRight } from '@phosphor-icons/react/ssr'
import { sheet } from '@/components/ui/sheet-classes'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Avatar } from '@/components/ui/avatar'
import { SelectField } from '@/components/ui/select'
import { cn } from '@/utils/lib'
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
    mentors: { id: string; name: string; photoUrl?: string | null }[]
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
        <div className={sheet.root}>
            <div
                className={sheet.overlay}
                onClick={onClose}
            />

            <div role="dialog" aria-modal="true" aria-labelledby="book-session-title" className={cn(sheet.panel, 'sm:max-w-xl')}>
                <div className={sheet.handle}><span className={sheet.handleBar} /></div>
                <div className={sheet.header}>
                    <div>
                        <h2 id="book-session-title" className={sheet.title}>Book a session</h2>
                        <p className={sheet.description}>Add at least 3 times for your mentor to choose from</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className={sheet.close}
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className={cn(sheet.body, 'space-y-5')}>
                    {mentors.length > 1 ? (
                        <div>
                            <label htmlFor="book-mentor" className={sheet.label}>Book with</label>
                            <SelectField
                                id="book-mentor"
                                value={mentorId}
                                onChange={(e) => setMentorId(e.target.value)}
                            >
                                <option value="">Select a mentor</option>
                                {mentors.map((mentor) => (
                                    <option key={mentor.id} value={mentor.id}>
                                        {mentor.name}
                                    </option>
                                ))}
                            </SelectField>
                        </div>
                    ) : mentors.length === 1 ? (
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                            <Avatar name={mentors[0].name} src={mentors[0].photoUrl} size="sm" />
                            <span>With <span className="font-medium text-foreground">{mentors[0].name}</span></span>
                        </div>
                    ) : null}

                    {timeSlots.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Added slots</span>
                                <span className={`inline-flex items-center gap-1 text-sm font-medium tabular-nums ${timeSlots.length >= 3 ? 'text-success' : 'text-warning'}`}>
                                    {timeSlots.length >= 3 ? <><Check weight="bold" className="size-4" />{`${timeSlots.length} slots`}</> : `${timeSlots.length}/3 minimum`}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {timeSlots.map((slot, index) => (
                                    <div
                                        key={`${slot.startTime}-${slot.endTime}`}
                                        className="flex items-center gap-2 rounded-full bg-tint-blue py-1.5 ps-3 pe-1.5 text-sm font-medium text-tint-blue-foreground tabular-nums animate-in fade-in-0 zoom-in-96 duration-150 ease-snappy motion-reduce:animate-none"
                                    >
                                        <Clock className="size-4 shrink-0" />
                                        <span>{formatSlotDisplay(slot)}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeTimeSlot(index)}
                                            className="grid size-7 place-items-center rounded-full transition-colors hover:bg-white/70"
                                            aria-label="Remove time slot"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 rounded-card bg-muted/60 p-4 sm:p-5">
                        <div>
                            <label className={sheet.label}>Date</label>
                            <DatePicker
                                value={date}
                                min={todayDate}
                                onChange={setDate}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={sheet.label}>Start time</label>
                                <SelectMenu
                                    value={startTime}
                                    onChange={setStartTime}
                                    options={startTimeOptions.map((value) => ({ value, label: value }))}
                                    placeholder="Select start time"
                                    maxHeight={200}
                                />
                            </div>
                            <div>
                                <label className={sheet.label}>End time</label>
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
                        <p className="text-sm text-muted-foreground">
                            Times shown in <strong className="font-medium text-foreground">{tz}</strong>
                        </p>
                        <button
                            type="button"
                            onClick={addTimeSlot}
                            disabled={!date || !startTime || !endTime}
                            className={cn(buttonVariants({ variant: 'outline' }), 'w-full bg-card')}
                        >
                            <Plus weight="bold" />
                            Add time slot
                        </button>
                    </div>

                    {error && (
                        <div role="alert" className="flex items-start gap-3 rounded-card bg-tint-rose p-4">
                            <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-destructive" />
                            <div className="flex-1">
                                <p className="text-sm leading-6 text-tint-rose-foreground">{error}</p>
                                {error.toLowerCase().includes('credits') && (
                                    <button
                                        onClick={() => router.push('/dashboard/student/services')}
                                        className={cn(buttonVariants({ variant: 'destructive', size: 'sm' }), 'mt-2')}
                                    >
                                        Get more credits
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setError(null)} aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-full text-tint-rose-foreground transition-colors hover:bg-white/60">
                                <X className="size-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className={sheet.footer}>
                    <button
                        onClick={onClose}
                        className={buttonVariants({ variant: 'ghost' })}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={buttonVariants()}
                    >
                        {loading ? (
                            <>
                                <Spinner className="size-4" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <PaperPlaneRight weight="fill" />
                                Send request
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
