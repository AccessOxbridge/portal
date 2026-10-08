'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PencilSimple as Pencil, Trash as Trash2, Plus, X, Check, VideoCamera as Video, MapPin, CalendarBlank as Calendar, Users, Clock } from '@phosphor-icons/react/ssr'
import { SelectField } from '@/components/ui/select'

interface Event {
    id: string
    title: string
    description: string | null
    event_type: string  // 'webinar' | 'in_person'
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
            event_type: event.event_type as 'webinar' | 'in_person',
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
                <div className="p-4 bg-tint-rose border border-border rounded-card text-tint-rose-foreground text-sm flex items-center justify-between">
                    {error}
                    <button onClick={() => setError(null)} className="text-destructive hover:text-tint-rose-foreground">
                        <X className="size-4" />
                    </button>
                </div>
            )}

            {/* Filter Tabs & Create Button */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-control text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
                    >
                        All events
                    </button>
                    <button
                        onClick={() => setFilter('webinar')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-control text-sm font-medium transition-colors ${filter === 'webinar' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
                    >
                        <Video className="size-4" />
                        Webinars
                    </button>
                    <button
                        onClick={() => setFilter('in_person')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-control text-sm font-medium transition-colors ${filter === 'in_person' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
                    >
                        <MapPin className="size-4" />
                        In person
                    </button>
                </div>

                {!isCreating && !editingId && (
                    <button
                        onClick={() => { setIsCreating(true); resetForm(); }}
                        className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 text-base in-data-[density=compact]:h-9 in-data-[density=compact]:px-4 in-data-[density=compact]:text-sm"
                    >
                        <Plus className="size-5" />
                        Add event
                    </button>
                )}
            </div>

            {/* Create/Edit Form */}
            {(isCreating || editingId) && (
                <div className="border border-transparent bg-card rounded-card p-6 shadow-border">
                    <h3 className="text-xl font-semibold text-foreground mb-6">
                        {isCreating ? 'Create new event' : 'Edit event'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                placeholder="e.g., Mastering the Oxbridge Interview"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Event type</label>
                            <div className="relative">
                                <SelectField
                                    value={formData.event_type}
                                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value as 'webinar' | 'in_person' })}
                                >
                                    <option value="webinar">Webinar</option>
                                    <option value="in_person">In person</option>
                                </SelectField>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Start date & time</label>
                            <input
                                type="datetime-local"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Duration (minutes)</label>
                            <input
                                type="number"
                                min="15"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Capacity</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 50 })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Host</label>
                            <input
                                type="text"
                                value={formData.host}
                                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                placeholder="e.g., Dr. Sarah Mitchell"
                            />
                        </div>
                        {formData.event_type === 'webinar' ? (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-foreground">Meeting URL</label>
                                <input
                                    type="url"
                                    value={formData.meeting_url}
                                    onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                    placeholder="https://zoom.us/..."
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-foreground">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                    placeholder="e.g., Oxford University, Broad Street"
                                />
                            </div>
                        )}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Recording URL (optional)</label>
                            <input
                                type="url"
                                value={formData.recording_url}
                                onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                placeholder="For past events"
                            />
                        </div>
                        <div className="flex items-center gap-6 pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="size-5 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Active (visible to students)</span>
                            </label>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm py-2.5 px-3.5 leading-relaxed resize-none"
                                rows={3}
                                placeholder="Brief description of the event"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={isCreating ? handleCreate : handleUpdate}
                            disabled={loading || !formData.title || !formData.date}
                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 text-base in-data-[density=compact]:h-9 in-data-[density=compact]:px-4 in-data-[density=compact]:text-sm"
                        >
                            <Check className="size-5" />
                            {loading ? 'Saving...' : (isCreating ? 'Create event' : 'Save changes')}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 border border-transparent bg-card text-foreground shadow-border hover:bg-muted h-11 px-5 text-base in-data-[density=compact]:h-9 in-data-[density=compact]:px-4 in-data-[density=compact]:text-sm"
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
                        className={`bg-card rounded-card border border-border p-6 hover:shadow-border transition-[background-color,box-shadow,color] duration-150 ${!event.is_active ? 'opacity-60' : ''}`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`size-12 rounded-control flex items-center justify-center shrink-0 ${event.event_type === 'webinar' ? 'bg-tint-blue' : 'bg-tint-rose'}`}>
                                    {event.event_type === 'webinar' ? (
                                        <Video className="size-6 text-brand" />
                                    ) : (
                                        <MapPin className="size-6 text-destructive" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.event_type === 'webinar' ? 'bg-tint-blue text-tint-blue-foreground' : 'bg-tint-rose text-tint-rose-foreground'}`}>
                                            {event.event_type === 'webinar' ? 'Webinar' : 'In person'}
                                        </span>
                                    </div>
                                    {event.description && (
                                        <p className="text-sm text-muted-foreground truncate mb-2">{event.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="size-4" />
                                            {formatDate(event.date)}
                                        </span>
                                        {event.duration_minutes && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="size-4" />
                                                {event.duration_minutes} mins
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Users className="size-4" />
                                            {event.registration_count}/{event.capacity || '∞'} registered
                                        </span>
                                        {event.host && (
                                            <span className="text-muted-foreground">Host: {event.host}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => toggleActive(event)}
                                    disabled={loading}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${event.is_active
                                        ? 'bg-tint-green text-tint-green-foreground hover:bg-tint-green/70'
                                        : 'bg-muted text-muted-foreground hover:bg-muted'
                                        }`}
                                >
                                    {event.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                    onClick={() => startEdit(event)}
                                    disabled={loading || isCreating || !!editingId}
                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Pencil className="size-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(event.id)}
                                    disabled={loading || isCreating || !!editingId}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-tint-rose rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredEvents.length === 0 && (
                    <div className="bg-muted/60 rounded-card p-12 text-center text-muted-foreground">
                        <Calendar className="size-12 mx-auto mb-4 text-muted-foreground/60" />
                        <p className="font-medium">No events yet</p>
                        <p className="text-sm mt-1">Create your first event to get started!</p>
                    </div>
                )}
            </div>
        </div>
    )
}
