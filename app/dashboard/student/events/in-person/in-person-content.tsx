'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Clock, Users, Navigation, ExternalLink, Loader2 } from 'lucide-react'

interface InPersonEvent {
    id: string
    title: string
    description: string | null
    date: string
    duration_minutes: number | null
    location: string | null
    host: string | null
    capacity: number | null
    registration_count: number
    is_registered: boolean
}

interface Props {
    upcomingEvents: InPersonEvent[]
    pastEvents: InPersonEvent[]
    userId: string
}

export default function InPersonEventsContent({ upcomingEvents, pastEvents, userId }: Props) {
    const [registering, setRegistering] = useState<string | null>(null)
    const [events, setEvents] = useState({ upcoming: upcomingEvents, past: pastEvents })
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

    const getSpotsLeft = (event: InPersonEvent) => {
        if (!event.capacity) return null
        return event.capacity - event.registration_count
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">In Person Events</h1>
                <p className="text-gray-500 mt-1">
                    Attend exclusive in-person meetups, tours, and workshops
                </p>
            </div>

            {/* Upcoming Events */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rose-500" />
                    Upcoming Events
                </h2>
                {events.upcoming.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
                        <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No upcoming in-person events</p>
                        <p className="text-sm mt-1">Check back soon for new events!</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {events.upcoming.map((event) => {
                            const spotsLeft = getSpotsLeft(event)
                            return (
                                <div
                                    key={event.id}
                                    className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-rose-100 transition-all duration-200"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-orange-400 rounded-xl flex items-center justify-center shrink-0">
                                                    <MapPin className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {event.title}
                                                    </h3>
                                                    {event.description && (
                                                        <p className="text-gray-600 text-sm mt-1">
                                                            {event.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 pl-15 space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {new Date(event.date).toLocaleDateString('en-GB', {
                                                        weekday: 'long',
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                    })}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    {new Date(event.date).toLocaleTimeString('en-GB', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                    {event.duration_minutes && ` (${event.duration_minutes} mins)`}
                                                </div>
                                                {event.location && (
                                                    <div className="flex items-start gap-2 text-sm text-gray-600">
                                                        <Navigation className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                        <span>{event.location}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span className={spotsLeft !== null && spotsLeft < 15 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                                                        {spotsLeft !== null ? `${spotsLeft} spots left` : `${event.registration_count} registered`}
                                                        {event.capacity && ` out of ${event.capacity}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex lg:flex-col items-center gap-2 lg:min-w-[140px]">
                                            {event.is_registered ? (
                                                <>
                                                    <span className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-medium">
                                                        ✓ Registered
                                                    </span>
                                                    <button
                                                        onClick={() => handleUnregister(event.id)}
                                                        disabled={registering === event.id}
                                                        className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        {registering === event.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            'Cancel Registration'
                                                        )}
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleRegister(event.id)}
                                                    disabled={registering === event.id || (spotsLeft !== null && spotsLeft <= 0)}
                                                    className="w-full px-6 py-2.5 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-xl text-sm font-medium hover:from-rose-600 hover:to-orange-500 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {registering === event.id ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Registering...
                                                        </>
                                                    ) : spotsLeft !== null && spotsLeft <= 0 ? (
                                                        'Event Full'
                                                    ) : (
                                                        'Register Now'
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* Past Events */}
            {events.past.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        Past Events
                    </h2>
                    <div className="grid gap-3">
                        {events.past.map((event) => (
                            <div
                                key={event.id}
                                className="bg-gray-50 border border-gray-100 rounded-xl p-4"
                            >
                                <div>
                                    <h3 className="font-medium text-gray-900">{event.title}</h3>
                                    {event.description && (
                                        <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(event.date).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                        {event.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {event.location}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
