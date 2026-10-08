'use client'

import { useMemo, useState } from 'react'
import { MagnifyingGlass as Search, FilmStrip as Film, PlayCircle, X, Clock, VideoCameraSlash as VideoOff } from '@phosphor-icons/react/ssr'

export interface BatchSession {
    id: string
    scheduledAt: string | null
    durationMinutes: number
    recordingAvailable: boolean
}

export interface SessionBatch {
    key: string
    studentId: string
    mentorId: string
    studentName: string
    mentorName: string
    sessions: BatchSession[]
}

interface Props {
    batches: SessionBatch[]
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Date TBD'
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function AdminRecordingsContent({ batches }: Props) {
    const [search, setSearch] = useState('')
    const [withRecordingOnly, setWithRecordingOnly] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeLabel, setActiveLabel] = useState<string>('')

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()

        return batches
            .map((batch) => {
                const nameMatch =
                    !q ||
                    batch.studentName.toLowerCase().includes(q) ||
                    batch.mentorName.toLowerCase().includes(q)

                if (!nameMatch) return null

                const sessions = withRecordingOnly
                    ? batch.sessions.filter((s) => s.recordingAvailable)
                    : batch.sessions

                if (sessions.length === 0) return null

                return { ...batch, sessions }
            })
            .filter((b): b is SessionBatch => b !== null)
    }, [batches, search, withRecordingOnly])

    if (batches.length === 0) {
        return (
            <div className="bg-card rounded-card border border-border p-12 text-center">
                <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Film className="size-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No completed sessions</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    Completed sessions will appear here grouped by student–mentor pair once they
                    finish.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by mentor or student name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-12"
                    />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={withRecordingOnly}
                        onChange={(e) => setWithRecordingOnly(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                    />
                    With recording only
                </label>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-card rounded-card border border-border p-10 text-center">
                    <p className="text-muted-foreground">No pairs match your filters.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filtered.map((batch) => {
                        const recordingCount = batch.sessions.filter(
                            (s) => s.recordingAvailable
                        ).length

                        return (
                            <section
                                key={batch.key}
                                className="bg-card rounded-card border border-border overflow-hidden"
                            >
                                <header className="px-6 py-4 border-b border-border bg-muted/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">
                                            {batch.studentName}
                                            <span className="mx-2 text-muted-foreground/60 font-normal">↔</span>
                                            {batch.mentorName}
                                        </h2>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {batch.sessions.length} session
                                            {batch.sessions.length === 1 ? '' : 's'}
                                            {' · '}
                                            {recordingCount} recording
                                            {recordingCount === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                </header>

                                <ul className="divide-y divide-border">
                                    {batch.sessions.map((session) => (
                                        <li
                                            key={session.id}
                                            className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground">
                                                    {formatDate(session.scheduledAt)}
                                                </p>
                                                <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
                                                    <Clock className="size-3.5" />
                                                    {session.durationMinutes} min
                                                    {session.recordingAvailable ? (
                                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-tint-green text-tint-green-foreground text-xs font-semibold">
                                                            Recording
                                                        </span>
                                                    ) : (
                                                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-semibold">
                                                            <VideoOff className="size-3" />
                                                            No recording
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            {session.recordingAvailable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveId(session.id)
                                                        setActiveLabel(
                                                            `${batch.studentName} ↔ ${batch.mentorName} · ${formatDate(session.scheduledAt)}`
                                                        )
                                                    }}
                                                    className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                                                >
                                                    <PlayCircle className="size-4" />
                                                    Watch
                                                </button>
                                            ) : (
                                                <span className="text-sm text-muted-foreground shrink-0">
                                                    —
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )
                    })}
                </div>
            )}

            {activeId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setActiveId(null)}
                    />
                    <div className="relative z-[61] w-full max-w-4xl mx-4 bg-black rounded-card shadow-border overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
                            <p className="text-sm text-white/90 font-medium truncate pr-4">
                                {activeLabel}
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveId(null)}
                                aria-label="Close recording"
                                className="size-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors shrink-0"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
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
        </div>
    )
}
