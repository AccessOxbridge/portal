'use client'

import { useState } from 'react'
import { handleMentorshipRequest } from './actions'
import { Info, AlertTriangle } from 'lucide-react'

interface TimeSlot {
    date: string
    startTime: string
    endTime: string
}

interface Request {
    id: string
    created_at: string
    responses: {
        subjects?: string[]
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

    const formatSlotDisplay = (slot: TimeSlot) => {
        // Parse the UTC ISO strings
        const start = new Date(slot.startTime)
        const end = new Date(slot.endTime)

        const dateStr = start.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        })
        const startTimeStr = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        const endTimeStr = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

        return `${dateStr}, ${startTimeStr} - ${endTimeStr}`
    }

    const handleAccept = async () => {
        if (!selectedSlot) return
        setLoading(true)
        try {
            await handleMentorshipRequest(request.id, 'accept', selectedSlot)
        } catch (error) {
            console.error('Failed to accept:', error)
            alert('Failed to accept request. Please try again.')
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

    // // Calculate time remaining
    // const getTimeRemaining = () => {
    //     const created = new Date(request.created_at).getTime()
    //     const now = Date.now()
    //     const expiry = created + 24 * 60 * 60 * 1000
    //     const remaining = expiry - now

    //     if (remaining <= 0) return 'Expired'

    //     const hours = Math.floor(remaining / (60 * 60 * 1000))
    //     const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
    //     return `${hours}h ${minutes}m`
    // }

    const timeSlots = request.responses?.timeSlots || []
    const responses = request.responses || {}

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="p-10 flex-1">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent font-black text-2xl shadow-inner">
                        {request.student?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900">{request.student?.full_name}</h3>
                        <span className="text-xs font-bold text-accent uppercase tracking-widest bg-accent/5 px-3 py-1 rounded-full">New Request</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {responses.academicInterests && (
                        <div className="space-y-1 sm:col-span-2">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Academic Interests</h4>
                            <p className="text-gray-700 leading-relaxed font-medium">{responses.academicInterests}</p>
                        </div>
                    )}
                    {responses.extracurriculars && (
                        <div className="space-y-1 sm:col-span-2">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Extracurriculars</h4>
                            <p className="text-gray-700 leading-relaxed font-medium">{responses.extracurriculars}</p>
                        </div>
                    )}
                    {responses.subjects && responses.subjects.length > 0 && (
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Subjects</h4>
                            <div className="flex flex-wrap gap-2">
                                {responses.subjects.map((subj, idx) => (
                                    <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">{subj}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {responses.targetUniversities && responses.targetUniversities.length > 0 && (
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Target Universities</h4>
                            <div className="flex flex-wrap gap-2">
                                {responses.targetUniversities.map((uni, idx) => (
                                    <span key={idx} className="bg-accent/10 text-accent px-3 py-1 rounded-lg text-sm font-medium">{uni}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {(responses.curriculum || responses.curriculumOther) && (
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Curriculum</h4>
                            <p className="text-gray-700 leading-relaxed font-medium">{responses.curriculum || responses.curriculumOther}</p>
                        </div>
                    )}
                    {(responses.schoolName || responses.schoolCountry) && (
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">School</h4>
                            <p className="text-gray-700 leading-relaxed font-medium">
                                {[responses.schoolName, responses.schoolCountry].filter(Boolean).join(', ')}
                            </p>
                        </div>
                    )}
                    <div className="space-y-1 sm:col-span-2">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Available Time Slots</h4>
                        {responses.timezone && (
                            <p className="text-xs text-gray-500 mb-2">Timezone: {responses.timezone}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {timeSlots.length > 0 ? (
                                timeSlots.map((slot, index) => (
                                    <span
                                        key={index}
                                        className="bg-accent/10 text-accent px-3 py-1.5 rounded-lg text-sm font-medium"
                                    >
                                        {formatSlotDisplay(slot)}
                                    </span>
                                ))
                            ) : (
                                <p className="text-gray-500 italic">No specific slots provided</p>
                            )}
                        </div>
                    </div>
                    {responses.anythingElse && (
                        <div className="space-y-1 sm:col-span-2">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Anything Else</h4>
                            <p className="text-gray-700 leading-relaxed font-medium">{responses.anythingElse}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-10 bg-gray-50/50 w-full md:w-80 flex flex-col justify-center gap-4">
                {/* <div className="mb-6">
                    <div className="text-sm font-bold text-gray-400 mb-2">EXPIRES IN</div>
                    <div className="text-3xl font-black text-gray-900 tabular-nums">
                        {getTimeRemaining()}
                    </div>
                </div> */}

                {!showSlotPicker ? (
                    <>
                        <button
                            onClick={() => setShowSlotPicker(true)}
                            disabled={timeSlots.length === 0}
                            className="w-full py-5 bg-accent text-white font-black rounded-2xl shadow-[0_8px_30px_rgb(67,56,202,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all text-lg disabled:opacity-50"
                        >
                            Select a Time Slot
                        </button>
                        <button
                            onClick={() => setShowRejectDialog(true)}
                            disabled={loading}
                            className="w-full py-4 text-gray-400 font-bold hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                            Decline
                        </button>
                    </>
                ) : (
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-600">Choose a Time Slot</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {timeSlots.map((slot, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedSlot === slot
                                        ? 'border-accent bg-accent/10 text-accent'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <span className="font-semibold">{formatSlotDisplay(slot)}</span>
                                </button>
                            ))}
                            <p className='text-xs text-gray-400'>
                                <Info className='inline-block w-4 h-4 mr-2' /> You can chat with the student to propose a new time slot
                            </p>
                        </div>

                        <button
                            onClick={handleAccept}
                            disabled={!selectedSlot || loading}
                            className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? 'Confirming...' : 'Confirm & Accept'}
                        </button>

                        <button
                            onClick={() => {
                                setShowSlotPicker(false)
                                setSelectedSlot(null)
                            }}
                            className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Reject Confirmation Dialog */}
            {showRejectDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => !loading && setShowRejectDialog(false)}
                    />
                    <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden p-10 animate-in zoom-in slide-in-from-bottom-4 duration-300">
                        <div className="w-20 h-20 bg-red-50 rounded-[24px] flex items-center justify-center text-red-600 mb-8 mx-auto shadow-inner">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 text-center mb-3">Decline Request?</h3>
                        <p className="text-gray-500 text-center mb-10 font-medium leading-relaxed">
                            Are you sure you want to decline this request from <span className="text-gray-900 font-bold">{request.student?.full_name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={handleReject}
                                disabled={loading}
                                className="w-full py-5 bg-red-600 text-white font-black rounded-2xl shadow-[0_8px_30px_rgb(220,38,38,0.2)] hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {loading ? 'Declining...' : 'Yes, Decline Request'}
                            </button>
                            <button
                                onClick={() => setShowRejectDialog(false)}
                                disabled={loading}
                                className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors"
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
