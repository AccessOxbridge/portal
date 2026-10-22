'use client'

import { useRef, useState } from 'react'
import { PlayCircle, X, FilmStrip as Film, Clock } from '@phosphor-icons/react/ssr'
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
    /** Empty-state sentence; the parent view words it for the parent. */
    emptyDescription?: string
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
            className="group overflow-hidden rounded-card bg-card text-left shadow-border outline-none transition-[box-shadow,scale] duration-150 ease-out hover:shadow-border-hover active:scale-[0.99] focus-visible:ring-[3px] focus-visible:ring-ring/40"
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
                {/* Soft scrim + centred play affordance */}
                <div className="absolute inset-0 bg-black/15 transition-colors duration-200 group-hover:bg-transparent" />
                <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0">
                    <span className="grid size-14 place-items-center rounded-full bg-white/90 text-primary shadow-overlay backdrop-blur">
                        <PlayCircle weight="fill" className="size-8" />
                    </span>
                </div>
                {/* Duration badge (YouTube-style) */}
                <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
                    <Clock className="size-3" />
                    {recording.duration_minutes} min
                </span>
            </div>
            <div className="p-4">
                <p className="truncate font-medium text-foreground">
                    Session with {recording.mentor_full_name}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
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
    emptyDescription = 'Recordings of your sessions will appear here a few minutes after each session ends.',
}: StudentRecordingsContentProps) {
    const [activeId, setActiveId] = useState<string | null>(null)

    if (recordings.length === 0) {
        return (
            <div className="rounded-card bg-card px-6 py-12 text-center shadow-border">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-tint-violet text-tint-violet-foreground">
                    <Film weight="duotone" className="size-7" />
                </div>
                <h2 className="text-base font-semibold text-foreground">No recordings yet</h2>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground text-pretty">
                    {emptyDescription}
                </p>
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div className="fixed inset-0 z-[1000] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setActiveId(null)}
                    />
                    <div className="relative z-[61] mx-4 w-full max-w-4xl overflow-hidden rounded-card bg-black shadow-overlay">
                        <button
                            type="button"
                            onClick={() => setActiveId(null)}
                            aria-label="Close recording"
                            className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-[background-color,scale] duration-150 ease-out hover:bg-white/20 active:scale-[0.96]"
                        >
                            <X className="size-5" />
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
