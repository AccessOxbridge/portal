'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Calendar, Clock, Plus } from 'lucide-react'

interface TimeSlot {
    date: string
    startTime: string
    endTime: string
}

interface BookSessionModalProps {
    isOpen: boolean
    onClose: () => void
    studentProfile: {
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
}

export default function BookSessionModal({ isOpen, onClose, studentProfile }: BookSessionModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
    const todayDate = new Date().toISOString().split('T')[0]
    const [newSlot, setNewSlot] = useState({ date: todayDate, startTime: '', endTime: '' })

    // When startTime changes, default endTime to +60 minutes (1 hr) if not set
    useEffect(() => {
        if (!newSlot.startTime) return
        // compute default endTime (1 hour after start)
        const [sh, sm] = newSlot.startTime.split(':').map(Number)
        const dateObj = new Date(`${newSlot.date}T${newSlot.startTime}:00`)
        dateObj.setMinutes(dateObj.getMinutes() + 60)
        const hh = String(dateObj.getHours()).padStart(2, '0')
        const mm = String(dateObj.getMinutes()).padStart(2, '0')
        const defaultEnd = `${hh}:${mm}`
        setNewSlot(prev => ({
            ...prev,
            endTime: prev.endTime || defaultEnd
        }))
    }, [newSlot.startTime, newSlot.date])

    // Helper to format time (HH:MM) to label like "2:30pm"
    const formatTimeLabel = (isoDate: string, time: string) => {
        const dt = new Date(`${isoDate}T${time}:00`)
        return dt.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
    }

    // When date is today and startTime is empty, default startTime to the next 15-minute slot
    useEffect(() => {
        const today = todayDate
        if (newSlot.date !== today) return
        if (newSlot.startTime) return

        const now = new Date()
        // compute minutes rounded up to next 15
        let mins = Math.ceil(now.getMinutes() / 15) * 15
        let hrs = now.getHours()
        if (mins === 60) {
            mins = 0
            hrs = (hrs + 1) % 24
        }
        const hh = String(hrs).padStart(2, '0')
        const mm = String(mins).padStart(2, '0')
        const next15 = `${hh}:${mm}`
        setNewSlot(prev => ({ ...prev, startTime: next15 }))
    }, [newSlot.date, newSlot.startTime, todayDate])

    const durationLabel = (minutes: number) => {
        if (minutes < 60) return `${minutes} mins`
        if (minutes === 60) return '1 hr'
        if (minutes % 60 === 0) return `${minutes / 60} hrs`
        return `${(minutes/60).toFixed(1)} hrs`
    }
    

    const addTimeSlot = () => {
        if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) return
        if (newSlot.endTime <= newSlot.startTime) {
            alert('End time must be after start time')
            return
        }

        // Create UTC ISO strings
        const startDateTime = new Date(`${newSlot.date}T${newSlot.startTime}:00`)
        const endDateTime = new Date(`${newSlot.date}T${newSlot.endTime}:00`)
        const startISO = startDateTime.toISOString()
        const endISO = endDateTime.toISOString()

        // Prevent adding the exact same time slot twice or any overlapping slot
        const duplicate = timeSlots.some(s => s.startTime === startISO && s.endTime === endISO)
        if (duplicate) {
            setError('This exact time slot has already been added')
            return
        }

        // Check for any overlap with existing slots
        const overlap = timeSlots.find(s => {
            const existingStart = new Date(s.startTime)
            const existingEnd = new Date(s.endTime)
            // overlap if newStart < existingEnd && newEnd > existingStart
            return startDateTime < existingEnd && endDateTime > existingStart
        })
        if (overlap) {
            const label = formatSlotDisplay(overlap)
            setError(`This slot overlaps an existing slot: ${label}. Please choose a different time.`)
            return
        }

        setTimeSlots(prev => [...prev, {
            date: newSlot.date,
            startTime: startISO,
            endTime: endISO
        }])
        // Keep the date when adding another slot (user requested same-day default)
        setNewSlot(prev => ({ date: prev.date || todayDate, startTime: '', endTime: '' }))
    }

    const removeTimeSlot = (index: number) => {
        setTimeSlots(prev => prev.filter((_, i) => i !== index))
    }

    const formatSlotDisplay = (slot: TimeSlot) => {
        const start = new Date(slot.startTime)
        const end = new Date(slot.endTime)

        const dateStr = start.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: studentProfile.timezone || undefined,
        })
        const startTimeStr = start.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: studentProfile.timezone || undefined,
        })
        const endTimeStr = end.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: studentProfile.timezone || undefined,
        })

        return `${dateStr}, ${startTimeStr} - ${endTimeStr}`
    }

    const handleSubmit = async () => {
        if (timeSlots.length < 3) {
            setError('Please add at least 3 time slots for better mentor matching')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/match-mentors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
            router.push('/dashboard/student')
            onClose()
        } catch (err: any) {
            console.error('Booking failed:', err)
            setError(err.message || 'An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900">Book a Session</h2>
                        <p className="text-gray-500 mt-1">Select your available time slots</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* error toast moved below Add Time Slot button */}

                    <div className="space-y-6">
                        {/* Info box */}
                        <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Calendar className="w-4 h-4 text-accent" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        Add at least <strong>3 time slots</strong> when you're available. This helps us match you with mentors more effectively.
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Timezone: <strong>{studentProfile.timezone || 'Not set'}</strong>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Existing slots */}
                        {timeSlots.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-700">Added Slots</span>
                                    <span className={`text-sm font-medium ${timeSlots.length >= 3 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {timeSlots.length >= 3 ? `✓ ${timeSlots.length} slots` : `${timeSlots.length}/3 minimum`}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {timeSlots.map((slot, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-xl font-medium text-sm"
                                        >
                                            <Clock className="w-4 h-4" />
                                            <span>{formatSlotDisplay(slot)}</span>
                                            <button
                                                onClick={() => removeTimeSlot(index)}
                                                className="hover:bg-accent/20 rounded-full p-1 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add slot form */}
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <div className="grid grid-cols-3 gap-3 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Date</label>
                                    <input
                                        type="date"
                                        value={newSlot.date}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Start Time</label>
                                <select
                                    value={newSlot.startTime}
                                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                                >
                                    <option value="">Select start time</option>
                                    {(() => {
                                        const startHour = 6
                                        const endHour = 23
                                        const nodes: any[] = []
                                        for (let h = startHour; h <= endHour; h++) {
                                            for (let m = 0; m < 60; m += 15) {
                                                const hh = String(h).padStart(2, '0')
                                                const mm = String(m).padStart(2, '0')
                                                const value = `${hh}:${mm}`
                                                const label = new Date(`${newSlot.date}T${value}:00`).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
                                                nodes.push(<option key={value} value={value}>{label}</option>)
                                            }
                                        }
                                        return nodes
                                    })()}
                                </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">End Time</label>
                                    {newSlot.startTime ? (
                                        <select
                                            value={newSlot.endTime}
                                            onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                                        >
                                            <option value="">Select end time / duration</option>
                                            {(() => {
                                                const durations = [30, 45, 60, 90, 120, 150, 180]
                                                const start = new Date(`${newSlot.date}T${newSlot.startTime}:00`)
                                                const nodes: any[] = []
                                                for (const d of durations) {
                                                    const dt = new Date(start.getTime() + d * 60000)
                                                    const hh = String(dt.getHours()).padStart(2, '0')
                                                    const mm = String(dt.getMinutes()).padStart(2, '0')
                                                    const value = `${hh}:${mm}`
                                                    const label = `${dt.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })} (${durationLabel(d)})`
                                                    nodes.push(<option key={value} value={value}>{label}</option>)
                                                }
                                                return nodes
                                            })()}
                                        </select>
                                    ) : (
                                        <select
                                            value={newSlot.endTime}
                                            onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                                        >
                                            <option value="">Select start time first</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={addTimeSlot}
                                disabled={!newSlot.date || !newSlot.startTime || !newSlot.endTime}
                                className="w-full py-3 bg-accent/10 text-accent font-bold rounded-xl hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Add Time Slot
                            </button>
                            {/* Inline error toast shown below Add Time Slot button */}
                            {error && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
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
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || timeSlots.length < 3}
                        className="bg-accent text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                            </span>
                        ) : (
                            'Submit Request'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
