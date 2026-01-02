'use client'

import { useState } from 'react'
import { handleMentorshipRequest } from './actions'

interface TimeSlot {
    date: string
    startTime: string
    endTime: string
}

interface Request {
    id: string
    created_at: string
    responses: {
        strengths: string
        weaknesses: string
        requirements: string
        timeSlots: TimeSlot[]
        anythingElse?: string
    }
    student: {
        full_name: string
    }
}

export function MentorRequestCard({ request }: { request: Request }) {
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
    const [showSlotPicker, setShowSlotPicker] = useState(false)
    const [loading, setLoading] = useState(false)

    const formatSlotDisplay = (slot: TimeSlot) => {
        const date = new Date(slot.date)
        const formatted = date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        })
        return `${formatted}, ${slot.startTime} - ${slot.endTime}`
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
        } catch (error) {
            console.error('Failed to reject:', error)
        } finally {
            setLoading(false)
        }
    }

    // Calculate time remaining
    const getTimeRemaining = () => {
        const created = new Date(request.created_at).getTime()
        const now = Date.now()
        const expiry = created + 24 * 60 * 60 * 1000
        const remaining = expiry - now

        if (remaining <= 0) return 'Expired'

        const hours = Math.floor(remaining / (60 * 60 * 1000))
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
        return `${hours}h ${minutes}m`
    }

    const timeSlots = request.responses?.timeSlots || []

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
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Strengths</h4>
                        <p className="text-gray-700 leading-relaxed font-medium">{request.responses.strengths}</p>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Weaknesses</h4>
                        <p className="text-gray-700 leading-relaxed font-medium">{request.responses.weaknesses}</p>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">What they are looking for</h4>
                        <p className="text-gray-700 leading-relaxed font-medium">{request.responses.requirements}</p>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Available Time Slots</h4>
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
                    {request.responses.anythingElse && (
                        <div className="space-y-1 sm:col-span-2">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Anything Else</h4>
                            <p className="text-gray-700 leading-relaxed font-medium">{request.responses.anythingElse}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-10 bg-gray-50/50 w-full md:w-80 flex flex-col justify-center gap-4">
                <div className="mb-6">
                    <div className="text-sm font-bold text-gray-400 mb-2">EXPIRES IN</div>
                    <div className="text-3xl font-black text-gray-900 tabular-nums">
                        {getTimeRemaining()}
                    </div>
                </div>

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
                            onClick={handleReject}
                            disabled={loading}
                            className="w-full py-4 text-gray-400 font-bold hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                            Decline
                        </button>
                    </>
                ) : (
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-600">Choose a Time Slot</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
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
        </div>
    )
}
