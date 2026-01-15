'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Plus, X, Check, Video, MapPin, Calendar, Users, Clock } from 'lucide-react'

interface Event {
    id: string
    title: string
    description: string | null
    event_type: 'webinar' | 'in_person'
    date: string
    end_time: string | null
    duration_minutes: number | null
    location: string | null
    meeting_url: string | null
    host: string | null
    capacity: number | null
    is_active: boolean | null
    sort_order: number | null
    recording_url: string | null
    registration_count: number
}

interface Props {
    initialEvents: Event[]
}

export default function EventsManager({ initialEvents }: Props) {
    const [events, setEvents] = useState<Event[]>(initialEvents)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'webinar' | 'in_person'>('all')
    const router = useRouter()

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        event_type: 'webinar' as 'webinar' | 'in_person',
        date: '',
        end_time: '',
        duration_minutes: 60,
        location: '',
        meeting_url: '',
        host: '',
        capacity: 50,
        is_active: true,
        sort_order: 0,
        recording_url: ''
    })

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            event_type: 'webinar',
            date: '',
            end_time: '',
            duration_minutes: 60,
            location: '',
            meeting_url: '',
            host: '',
            capacity: 50,
            is_active: true,
            sort_order: events.length,
            recording_url: ''
        })
    }

    const startEdit = (event: Event) => {
        setEditingId(event.id)
        setFormData({
            title: event.title,
            description: event.description || '',
            event_type: event.event_type,
            date: event.date ? new Date(event.date).toISOString().slice(0, 16) : '',
            end_time: event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
            duration_minutes: event.duration_minutes || 60,
            location: event.location || '',
            meeting_url: event.meeting_url || '',
            host: event.host || '',
            capacity: event.capacity || 50,
            is_active: event.is_active ?? true,
            sort_order: event.sort_order ?? 0,
            recording_url: event.recording_url || ''
        })
        setIsCreating(false)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setIsCreating(false)
        resetForm()
    }

    const handleCreate = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    date: formData.date ? new Date(formData.date).toISOString() : null,
                    end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setEvents([...events, { ...data.event, registration_count: 0 }])
            setIsCreating(false)
            resetForm()
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async () => {
        if (!editingId) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/events', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingId,
                    ...formData,
                    date: formData.date ? new Date(formData.date).toISOString() : null,
                    end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setEvents(events.map(e => e.id === editingId ? { ...data.event, registration_count: e.registration_count } : e))
            setEditingId(null)
            resetForm()
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event? This will also remove all registrations.')) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/events?id=${id}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setEvents(events.filter(e => e.id !== id))
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleActive = async (event: Event) => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/events', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: event.id, is_active: !event.is_active })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setEvents(events.map(e => e.id === event.id ? { ...data.event, registration_count: e.registration_count } : e))
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = filter === 'all' ? events : events.filter(e => e.event_type === filter)

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="space-y-8">
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center justify-between">
                    {error}
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Filter Tabs & Create Button */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'all' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        All Events
                    </button>
                    <button
                        onClick={() => setFilter('webinar')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'webinar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        <Video className="w-4 h-4" />
                        Webinars
                    </button>
                    <button
                        onClick={() => setFilter('in_person')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'in_person' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        <MapPin className="w-4 h-4" />
                        In Person
                    </button>
                </div>

                {!isCreating && !editingId && (
                    <button
                        onClick={() => { setIsCreating(true); resetForm(); }}
                        className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Add Event
                    </button>
                )}
            </div>

            {/* Create/Edit Form */}
            {(isCreating || editingId) && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">
                        {isCreating ? 'Create New Event' : 'Edit Event'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                placeholder="e.g., Mastering the Oxbridge Interview"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Event Type</label>
                            <select
                                value={formData.event_type}
                                onChange={(e) => setFormData({ ...formData, event_type: e.target.value as 'webinar' | 'in_person' })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            >
                                <option value="webinar">Webinar</option>
                                <option value="in_person">In Person</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Start Date & Time</label>
                            <input
                                type="datetime-local"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Duration (minutes)</label>
                            <input
                                type="number"
                                min="15"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Capacity</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 50 })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Host</label>
                            <input
                                type="text"
                                value={formData.host}
                                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                placeholder="e.g., Dr. Sarah Mitchell"
                            />
                        </div>
                        {formData.event_type === 'webinar' ? (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Meeting URL</label>
                                <input
                                    type="url"
                                    value={formData.meeting_url}
                                    onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                    placeholder="https://zoom.us/..."
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                    placeholder="e.g., Oxford University, Broad Street"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Recording URL (optional)</label>
                            <input
                                type="url"
                                value={formData.recording_url}
                                onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                placeholder="For past events"
                            />
                        </div>
                        <div className="flex items-center gap-6 pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
                                />
                                <span className="text-sm font-medium text-gray-700">Active (visible to students)</span>
                            </label>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none resize-none"
                                rows={3}
                                placeholder="Brief description of the event"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={isCreating ? handleCreate : handleUpdate}
                            disabled={loading || !formData.title || !formData.date}
                            className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                        >
                            <Check className="w-5 h-5" />
                            {loading ? 'Saving...' : (isCreating ? 'Create Event' : 'Save Changes')}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Events List */}
            <div className="space-y-4">
                {filteredEvents.map((event) => (
                    <div
                        key={event.id}
                        className={`bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-all ${!event.is_active ? 'opacity-60' : ''}`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${event.event_type === 'webinar' ? 'bg-blue-100' : 'bg-rose-100'}`}>
                                    {event.event_type === 'webinar' ? (
                                        <Video className="w-6 h-6 text-blue-600" />
                                    ) : (
                                        <MapPin className="w-6 h-6 text-rose-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.event_type === 'webinar' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {event.event_type === 'webinar' ? 'Webinar' : 'In Person'}
                                        </span>
                                    </div>
                                    {event.description && (
                                        <p className="text-sm text-gray-500 truncate mb-2">{event.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {formatDate(event.date)}
                                        </span>
                                        {event.duration_minutes && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {event.duration_minutes} mins
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {event.registration_count}/{event.capacity || '∞'} registered
                                        </span>
                                        {event.host && (
                                            <span className="text-gray-600">Host: {event.host}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => toggleActive(event)}
                                    disabled={loading}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${event.is_active
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                >
                                    {event.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                    onClick={() => startEdit(event)}
                                    disabled={loading || isCreating || !!editingId}
                                    className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(event.id)}
                                    disabled={loading || isCreating || !!editingId}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredEvents.length === 0 && (
                    <div className="bg-gray-50 rounded-2xl p-12 text-center text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">No events yet</p>
                        <p className="text-sm mt-1">Create your first event to get started!</p>
                    </div>
                )}
            </div>
        </div>
    )
}
