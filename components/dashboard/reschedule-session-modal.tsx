'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, CalendarBlank as Calendar, Clock, WarningCircle } from '@phosphor-icons/react/ssr'
import { sheet } from '@/components/ui/sheet-classes'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/utils/lib'
import { addMinutesToWallTime, getZonedNow, resolveTz, zonedTimeToUtcISO, formatDateInTz, formatTimeInTz } from '@/lib/timezone'
import DatePicker from '@/components/dashboard/date-picker'
import SelectMenu from '@/components/dashboard/select-menu'

interface RescheduleSessionModalProps {
    isOpen: boolean
    onClose: () => void
    sessionId: string
    counterpartName: string
    currentScheduledAt: string | null
    timezone?: string | null
}

export default function RescheduleSessionModal({
    isOpen,
    onClose,
    sessionId,
    counterpartName,
    currentScheduledAt,
    timezone,
}: RescheduleSessionModalProps) {
    const router = useRouter()
    const tz = resolveTz(timezone)
    const todayDate = getZonedNow(tz).date

    const [date, setDate] = useState(todayDate)
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) {
            setDate(getZonedNow(tz).date)
            setStartTime('')
            setEndTime('')
            setNote('')
            setError(null)
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

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

    const currentDisplay = currentScheduledAt
        ? `${formatDateInTz(currentScheduledAt, timezone)} at ${formatTimeInTz(currentScheduledAt, timezone)}`
        : 'TBD'

    const handleSubmit = async () => {
        setError(null)

        if (!date || !startTime || !endTime) {
            setError('Please choose a date, start time and end time.')
            return
        }

        const startISO = zonedTimeToUtcISO(date, startTime, tz)
        let endISO = zonedTimeToUtcISO(date, endTime, tz)

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
            const response = await fetch(`/api/sessions/${sessionId}/reschedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timeSlot: { date, startTime: startISO, endTime: endISO },
                    note: note.trim() || undefined,
                    timezone: tz,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Couldn't send your reschedule request. Try again in a moment.")
            }

            router.refresh()
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className={sheet.root}>
            <div className={sheet.overlay} onClick={onClose} />

            <div role="dialog" aria-modal="true" aria-labelledby="reschedule-title" className={cn(sheet.panel, 'sm:max-w-xl')}>
                <div className={sheet.handle}><span className={sheet.handleBar} /></div>
                <div className={sheet.header}>
                    <div>
                        <h2 id="reschedule-title" className={sheet.title}>Reschedule session</h2>
                        <p className={sheet.description}>Propose a new time with {counterpartName}</p>
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
                    <div className="rounded-card bg-tint-blue p-4">
                        <div className="flex items-start gap-3">
                            <Calendar weight="duotone" className="mt-0.5 size-5 shrink-0 text-tint-blue-foreground" />
                            <div>
                                <p className="text-sm leading-relaxed text-foreground text-pretty">
                                    Your current session stays booked until they accept. Propose one new time below.
                                </p>
                                <p className="mt-2 text-sm text-tint-blue-foreground tabular-nums">
                                    <strong className="font-medium">Current:</strong> {currentDisplay}
                                </p>
                                <p className="mt-0.5 text-sm text-tint-blue-foreground">
                                    Timezone: <strong className="font-medium">{tz}</strong>
                                </p>
                            </div>
                        </div>
                    </div>

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
                    </div>

                    <div>
                        <label htmlFor="reschedule-note" className={sheet.label}>Message <span className="font-normal text-muted-foreground">(optional)</span></label>
                        <Textarea
                            id="reschedule-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            placeholder="Let them know why you need to reschedule…"
                            className="resize-none"
                        />
                    </div>

                    {error && (
                        <div role="alert" className="flex items-start gap-3 rounded-card bg-tint-rose p-4">
                            <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-destructive" />
                            <p className="flex-1 text-sm leading-6 text-tint-rose-foreground">{error}</p>
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
                        disabled={loading || !date || !startTime || !endTime}
                        className={buttonVariants()}
                    >
                        {loading ? (
                            <>
                                <Spinner className="size-4" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Clock weight="bold" />
                                Send reschedule request
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
