'use client'

import { useState } from 'react'
import { handleMentorshipRequest } from '@/lib/actions/mentorship-requests'
import { Info, Warning as AlertTriangle } from '@phosphor-icons/react/ssr'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'

interface TimeSlot {
    date: string
    startTime: string
    endTime: string
}

interface Subject {
    name: string
    predicted_grade?: string
}

interface Request {
    id: string
    created_at: string
    reschedule_of_session_id?: string | null
    responses: {
        subjects?: (string | Subject)[]
        timezone?: string
        timeSlots: TimeSlot[]
        curriculum?: string
        curriculumOther?: string
        schoolName?: string
        schoolCountry?: string
        anythingElse?: string
        extracurriculars?: string
        academicInterests?: string
        targetUniversities?: string[]
        note?: string
        original_scheduled_at?: string
    }
    student: {
        full_name: string
    }
}

export function MentorRequestCard({ request }: { request: Request }) {
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
    const [showSlotPicker, setShowSlotPicker] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [loading, setLoading] = useState(false)

    const isReschedule = !!request.reschedule_of_session_id

    const formatSlotDisplay = (slot: TimeSlot) => {
        // The student proposed these slots in their own timezone — show them in
        // that timezone (with label) so the mentor reads them unambiguously.
        const tz = request.responses.timezone || null
        const dateStr = formatDateInTz(slot.startTime, tz, { weekday: 'short', day: 'numeric', month: 'short' })
        const startTimeStr = formatTimeInTz(slot.startTime, tz, { withZone: false })
        const endTimeStr = formatTimeInTz(slot.endTime, tz, { withZone: true })

        return `${dateStr}, ${startTimeStr} - ${endTimeStr}`
    }

    const handleAccept = async (slot?: TimeSlot) => {
        const effective = slot ?? selectedSlot ?? request.responses?.timeSlots?.[0]
        if (!effective) return
        setLoading(true)
        try {
            await handleMentorshipRequest(request.id, 'accept', effective)
        } catch (error) {
            console.error('Failed to accept:', error)
            alert(error instanceof Error ? error.message : 'Failed to accept request. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleReject = async () => {
        setLoading(true)
        try {
            await handleMentorshipRequest(request.id, 'reject')
            setShowRejectDialog(false)
        } catch (error) {
            console.error('Failed to reject:', error)
            alert('Failed to decline request. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const timeSlots = request.responses?.timeSlots || []
    const responses = request.responses || {}
    const originalDisplay = responses.original_scheduled_at
        ? formatDateInTz(responses.original_scheduled_at, responses.timezone || null) +
          ' at ' +
          formatTimeInTz(responses.original_scheduled_at, responses.timezone || null)
        : null

    if (isReschedule) {
        const proposed = timeSlots[0]
        return (
            <div className="border border-transparent bg-card rounded-card shadow-border overflow-hidden p-6 sm:p-10">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div className="flex items-start gap-4">
                        <div className="size-16 bg-primary/10 rounded-card flex items-center justify-center text-primary font-semibold text-2xl shadow-inner shrink-0">
                            {request.student?.full_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-tint-amber-foreground bg-tint-amber px-3 py-1 rounded-full">
                                Reschedule request
                            </span>
                            <h3 className="text-2xl font-semibold text-foreground mt-3">{request.student?.full_name}</h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                Proposed new time:{' '}
                                <strong className="text-foreground">
                                    {proposed ? formatSlotDisplay(proposed) : 'TBD'}
                                </strong>
                            </p>
                            {originalDisplay && (
                                <p className="text-xs text-muted-foreground mt-1">Current session: {originalDisplay}</p>
                            )}
                            {responses.note && (
                                <p className="mt-3 text-sm text-muted-foreground italic">&ldquo;{responses.note}&rdquo;</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowRejectDialog(true)}
                            disabled={loading}
                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-tint-rose text-tint-rose-foreground hover:bg-tint-rose/70 h-11 px-5 text-base"
                        >
                            Decline
                        </button>
                        <button
                            onClick={() => handleAccept(proposed)}
                            disabled={loading || !proposed}
                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-success text-white hover:bg-success/90 h-11 px-5 text-base"
                        >
                            {loading ? 'Confirming…' : 'Accept New Time'}
                        </button>
                    </div>
                </div>

                {showRejectDialog && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => !loading && setShowRejectDialog(false)}
                        />
                        <div className="relative bg-card shadow-border w-full max-w-sm max-h-[92dvh] sm:max-h-none overflow-y-auto sm:overflow-hidden rounded-t-[32px] sm:rounded-card p-6 sm:p-10">
                            <div className="size-20 bg-tint-rose rounded-card flex items-center justify-center text-destructive mb-8 mx-auto shadow-inner">
                                <AlertTriangle className="size-10" />
                            </div>
                            <h3 className="text-2xl font-semibold text-foreground text-center mb-3">Decline reschedule?</h3>
                            <p className="text-muted-foreground text-center mb-10 font-medium leading-relaxed">
                                The original session with <span className="text-foreground font-semibold">{request.student?.full_name}</span> will remain booked.
                            </p>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleReject}
                                    disabled={loading}
                                    className="w-full py-5 bg-destructive text-white font-semibold rounded-card hover:bg-destructive/90 transition-[background-color,box-shadow,color] duration-150 disabled:opacity-50"
                                >
                                    {loading ? 'Declining...' : 'Yes, Decline'}
                                </button>
                                <button
                                    onClick={() => setShowRejectDialog(false)}
                                    disabled={loading}
                                    className="w-full py-3 text-muted-foreground font-semibold hover:text-muted-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="border border-transparent bg-card rounded-card shadow-border overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-6 sm:p-10 flex-1">
                <div className="flex items-center gap-4 mb-8">
                    <div className="size-16 bg-primary/10 rounded-card flex items-center justify-center text-primary font-semibold text-2xl shadow-inner">
                        {request.student?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <h3 className="text-2xl font-semibold text-foreground">{request.student?.full_name}</h3>
                        <span className="text-xs font-semibold text-primary bg-primary/5 px-3 py-1 rounded-full">New request</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {responses.academicInterests && (
                        <div className="space-y-1 sm:col-span-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Academic interests</h4>
                            <p className="text-foreground leading-relaxed font-medium">{responses.academicInterests}</p>
                        </div>
                    )}
                    {responses.extracurriculars && (
                        <div className="space-y-1 sm:col-span-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Extracurriculars</h4>
                            <p className="text-foreground leading-relaxed font-medium">{responses.extracurriculars}</p>
                        </div>
                    )}
                    {responses.subjects && responses.subjects.length > 0 && (
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-muted-foreground">Subjects</h4>
                            <div className="flex flex-wrap gap-2">
                                {responses.subjects.map((subj, idx) => {
                                    const label = typeof subj === 'string'
                                        ? subj
                                        : `${subj.name}${subj.predicted_grade ? ` (${subj.predicted_grade})` : ''}`

                                    return (
                                        <span key={idx} className="bg-muted text-foreground px-3 py-1 rounded-lg text-sm font-medium">
                                            {label}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    {responses.targetUniversities && responses.targetUniversities.length > 0 && (
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-muted-foreground">Target universities</h4>
                            <div className="flex flex-wrap gap-2">
                                {responses.targetUniversities.map((uni, idx) => (
                                    <span key={idx} className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-medium">{uni}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {(responses.curriculum || responses.curriculumOther) && (
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-muted-foreground">Curriculum</h4>
                            <p className="text-foreground leading-relaxed font-medium">{responses.curriculum || responses.curriculumOther}</p>
                        </div>
                    )}
                    {(responses.schoolName || responses.schoolCountry) && (
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-muted-foreground">School</h4>
                            <p className="text-foreground leading-relaxed font-medium">
                                {[responses.schoolName, responses.schoolCountry].filter(Boolean).join(', ')}
                            </p>
                        </div>
                    )}
                    <div className="space-y-1 sm:col-span-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Available time slots</h4>
                        {responses.timezone && (
                            <p className="text-xs text-muted-foreground mb-2">Timezone: {responses.timezone}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {timeSlots.length > 0 ? (
                                timeSlots.map((slot, index) => (
                                    <span
                                        key={index}
                                        className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-medium"
                                    >
                                        {formatSlotDisplay(slot)}
                                    </span>
                                ))
                            ) : (
                                <p className="text-muted-foreground italic">No specific slots provided</p>
                            )}
                        </div>
                    </div>
                    {responses.anythingElse && (
                        <div className="space-y-1 sm:col-span-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Anything else</h4>
                            <p className="text-foreground leading-relaxed font-medium">{responses.anythingElse}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 sm:p-10 bg-muted/60 w-full md:w-80 flex flex-col justify-center gap-4">
                {/* <div className="mb-6">
                    <div className="text-sm font-semibold text-muted-foreground mb-2">Expires in</div>
                    <div className="text-3xl font-semibold text-foreground tabular-nums">
                        {getTimeRemaining()}
                    </div>
                </div> */}

                {!showSlotPicker ? (
                    <>
                        <button
                            onClick={() => setShowSlotPicker(true)}
                            disabled={timeSlots.length === 0}
                            className="w-full py-5 bg-primary text-white font-semibold rounded-card shadow-[0_8px_30px_rgb(67,56,202,0.3)] active:scale-[0.98] transition-[background-color,box-shadow,color] duration-150 text-lg disabled:opacity-50"
                        >
                            Select a time slot
                        </button>
                        <button
                            onClick={() => setShowRejectDialog(true)}
                            disabled={loading}
                            className="w-full py-4 text-muted-foreground font-semibold hover:text-destructive transition-colors disabled:opacity-50"
                        >
                            Decline
                        </button>
                    </>
                ) : (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-muted-foreground">Choose a time slot</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {timeSlots.map((slot, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`w-full text-left px-4 py-3 rounded-control border-2 transition-[background-color,box-shadow,color] duration-150 ${selectedSlot === slot
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:border-border'
                                        }`}
                                >
                                    <span className="font-semibold">{formatSlotDisplay(slot)}</span>
                                </button>
                            ))}
                            <p className='text-xs text-muted-foreground'>
                                <Info className='inline-block size-4 mr-2' /> You can chat with the student to propose a new time slot
                            </p>
                        </div>

                        <button
                            onClick={() => handleAccept()}
                            disabled={!selectedSlot || loading}
                            className="w-full py-4 bg-success text-white font-semibold rounded-card shadow-border active:scale-[0.98] transition-[background-color,box-shadow,color] duration-150 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? 'Confirming...' : 'Confirm & Accept'}
                        </button>

                        <button
                            onClick={() => {
                                setShowSlotPicker(false)
                                setSelectedSlot(null)
                            }}
                            className="w-full py-3 text-muted-foreground font-semibold hover:text-muted-foreground transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Reject Confirmation Dialog */}
            {showRejectDialog && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm duration-300"
                        onClick={() => !loading && setShowRejectDialog(false)}
                    />
                    <div className="relative bg-card shadow-border w-full max-w-sm max-h-[92dvh] sm:max-h-none overflow-y-auto sm:overflow-hidden rounded-t-[32px] sm:rounded-card p-6 sm:p-10 duration-300">
                        <div className="size-20 bg-tint-rose rounded-card flex items-center justify-center text-destructive mb-8 mx-auto shadow-inner">
                            <AlertTriangle className="size-10" />
                        </div>
                        <h3 className="text-2xl font-semibold text-foreground text-center mb-3">Decline request?</h3>
                        <p className="text-muted-foreground text-center mb-10 font-medium leading-relaxed">
                            Are you sure you want to decline this request from <span className="text-foreground font-semibold">{request.student?.full_name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={handleReject}
                                disabled={loading}
                                className="w-full py-5 bg-destructive text-white font-semibold rounded-card shadow-[0_8px_30px_rgb(220,38,38,0.2)] hover:bg-destructive/90 active:scale-[0.98] transition-[background-color,box-shadow,color] duration-150 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {loading ? 'Declining...' : 'Yes, Decline Request'}
                            </button>
                            <button
                                onClick={() => setShowRejectDialog(false)}
                                disabled={loading}
                                className="w-full py-3 text-muted-foreground font-semibold hover:text-muted-foreground transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
