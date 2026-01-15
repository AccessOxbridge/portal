'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Calendar, Clock, Users, ExternalLink, Loader2 } from 'lucide-react'

interface Webinar {
    id: string
    title: string
    description: string | null
    date: string
    duration_minutes: number | null
    host: string | null
    capacity: number | null
    meeting_url: string | null
    recording_url: string | null
    registration_count: number
    is_registered: boolean
}

interface Props {
    upcomingWebinars: Webinar[]
    pastWebinars: Webinar[]
    userId: string
}

export default function WebinarsContent({ upcomingWebinars, pastWebinars, userId }: Props) {
    const [registering, setRegistering] = useState<string | null>(null)
    const [events, setEvents] = useState({ upcoming: upcomingWebinars, past: pastWebinars })
    const router = useRouter()

    const handleRegister = async (eventId: string) => {
        setRegistering(eventId)
        try {
            const res = await fetch('/api/events/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId })
            })

            if (res.ok) {
                // Update local state
                setEvents(prev => ({
                    ...prev,
                    upcoming: prev.upcoming.map(e =>
                        e.id === eventId
                            ? { ...e, is_registered: true, registration_count: e.registration_count + 1 }
                            : e
                    )
                }))
                router.refresh()
            }
        } catch (error) {
            console.error('Registration failed:', error)
        } finally {
            setRegistering(null)
        }
    }

    const handleUnregister = async (eventId: string) => {
        setRegistering(eventId)
        try {
            const res = await fetch('/api/events/register', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId })
            })

            if (res.ok) {
                setEvents(prev => ({
                    ...prev,
                    upcoming: prev.upcoming.map(e =>
                        e.id === eventId
                            ? { ...e, is_registered: false, registration_count: Math.max(0, e.registration_count - 1) }
                            : e
                    )
                }))
                router.refresh()
            }
        } catch (error) {
            console.error('Unregistration failed:', error)
        } finally {
            setRegistering(null)
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Webinars</h1>
                <p className="text-gray-500 mt-1">
                    Join live online sessions with mentors and experts
                </p>
            </div>

            {/* Upcoming Webinars */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-600" />
                    Upcoming Webinars
                </h2>
                {events.upcoming.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
                        <Video className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No upcoming webinars</p>
                        <p className="text-sm mt-1">Check back soon for new sessions!</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {events.upcoming.map((webinar) => (
                            <div
                                key={webinar.id}
                                className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-blue-100 transition-all duration-200"
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {webinar.title}
                                        </h3>
                                        {webinar.description && (
                                            <p className="text-gray-600 text-sm mb-4">
                                                {webinar.description}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(webinar.date).toLocaleDateString('en-GB', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                {new Date(webinar.date).toLocaleTimeString('en-GB', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                                {webinar.duration_minutes && ` (${webinar.duration_minutes} mins)`}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4" />
                                                {webinar.registration_count}
                                                {webinar.capacity && `/${webinar.capacity}`} registered
                                            </span>
                                        </div>
                                        {webinar.host && (
                                            <p className="mt-3 text-sm text-gray-700">
                                                <span className="font-medium">Hosted by:</span> {webinar.host}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex md:flex-col items-center gap-2">
                                        {webinar.is_registered ? (
                                            <>
                                                <span className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-medium">
                                                    ✓ Registered
                                                </span>
                                                <button
                                                    onClick={() => handleUnregister(webinar.id)}
                                                    disabled={registering === webinar.id}
                                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    {registering === webinar.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        'Cancel'
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleRegister(webinar.id)}
                                                disabled={registering === webinar.id || (webinar.capacity !== null && webinar.registration_count >= webinar.capacity)}
                                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {registering === webinar.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Registering...
                                                    </>
                                                ) : (
                                                    'Register Now'
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Past Webinars */}
            {events.past.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        Past Webinars
                    </h2>
                    <div className="grid gap-3">
                        {events.past.map((webinar) => (
                            <div
                                key={webinar.id}
                                className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="font-medium text-gray-900">{webinar.title}</h3>
                                    {webinar.description && (
                                        <p className="text-sm text-gray-500 mt-0.5">{webinar.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(webinar.date).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </p>
                                </div>
                                {webinar.recording_url && (
                                    <a
                                        href={webinar.recording_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Watch Recording
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
