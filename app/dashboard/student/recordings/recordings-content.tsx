'use client'

import { useRef, useState } from 'react'
import { PlayCircle, X, Film, Clock } from 'lucide-react'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'

interface Recording {
    id: string
    scheduled_at: string | null
    duration_minutes: number
    mentor_full_name: string
    mentor_photo_url: string | null
}

interface StudentRecordingsContentProps {
    recordings: Recording[]
    timezone?: string | null
}

// A single card with a YouTube-style hover preview: shows a still frame from
// the recording, and plays a muted, looping preview while hovered.
function RecordingCard({
    recording,
    timezone,
    onOpen,
}: {
    recording: Recording
    timezone: string | null
    onOpen: () => void
}) {
    const videoRef = useRef<HTMLVideoElement>(null)

    const formatDate = (dateString: string | null) =>
        dateString ? formatDateInTz(dateString, timezone) : 'Date TBD'
    const formatTime = (dateString: string | null) =>
        dateString ? formatTimeInTz(dateString, timezone) : ''

    const handleEnter = () => {
        const v = videoRef.current
        if (!v) return
        v.currentTime = 0
        v.play().catch(() => {})
    }

    const handleLeave = () => {
        const v = videoRef.current
        if (!v) return
        v.pause()
        // Reset to a representative still frame for the poster.
        try {
            v.currentTime = 2
        } catch {
            /* metadata may not be ready yet */
        }
    }

    return (
        <button
            type="button"
            onClick={onOpen}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className="group text-left bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-accent/30 transition-all overflow-hidden"
        >
            <div className="relative aspect-video bg-black overflow-hidden">
                <video
                    ref={videoRef}
                    src={`/api/recording/${recording.id}#t=2`}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark gradient + centered play affordance */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-0 transition-opacity">
                    <span className="w-14 h-14 rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white shadow-lg">
                        <PlayCircle className="w-8 h-8" />
                    </span>
                </div>
                {/* Duration badge (YouTube-style) */}
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/75 text-white text-[11px] font-semibold">
                    <Clock className="w-3 h-3" />
                    {recording.duration_minutes} min
                </span>
            </div>
            <div className="p-4">
                <p className="font-bold text-gray-900 truncate">
                    Session with {recording.mentor_full_name}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                    {formatDate(recording.scheduled_at)}
                    {formatTime(recording.scheduled_at) && ` · ${formatTime(recording.scheduled_at)}`}
                </p>
            </div>
        </button>
    )
}

export default function StudentRecordingsContent({
    recordings,
    timezone = null,
}: StudentRecordingsContentProps) {
    const [activeId, setActiveId] = useState<string | null>(null)

    if (recordings.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Film className="w-7 h-7 text-gray-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">No recordings yet</h2>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">
                    Recordings of your sessions will appear here a few minutes after each
                    session ends.
                </p>
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {recordings.map((rec) => (
                    <RecordingCard
                        key={rec.id}
                        recording={rec}
                        timezone={timezone}
                        onOpen={() => setActiveId(rec.id)}
                    />
                ))}
            </div>

            {activeId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setActiveId(null)}
                    />
                    <div className="relative z-[61] w-full max-w-4xl mx-4 bg-black rounded-2xl shadow-2xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setActiveId(null)}
                            aria-label="Close recording"
                            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <video
                            key={activeId}
                            src={`/api/recording/${activeId}`}
                            controls
                            autoPlay
                            controlsList="nodownload"
                            className="w-full max-h-[80vh] bg-black"
                        >
                            Your browser does not support video playback.
                        </video>
                    </div>
                </div>
            )}
        </>
    )
}
