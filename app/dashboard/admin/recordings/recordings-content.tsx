'use client'

import { useMemo, useState } from 'react'
import { Search, Film, PlayCircle, X, Clock, VideoOff } from 'lucide-react'

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
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Film className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Completed Sessions</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
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
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by mentor or student name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                    />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={withRecordingOnly}
                        onChange={(e) => setWithRecordingOnly(e.target.checked)}
                        className="rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    With recording only
                </label>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                    <p className="text-gray-500">No pairs match your filters.</p>
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
                                className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                            >
                                <header className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">
                                            {batch.studentName}
                                            <span className="mx-2 text-gray-300 font-normal">↔</span>
                                            {batch.mentorName}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            {batch.sessions.length} session
                                            {batch.sessions.length === 1 ? '' : 's'}
                                            {' · '}
                                            {recordingCount} recording
                                            {recordingCount === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                </header>

                                <ul className="divide-y divide-gray-100">
                                    {batch.sessions.map((session) => (
                                        <li
                                            key={session.id}
                                            className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900">
                                                    {formatDate(session.scheduledAt)}
                                                </p>
                                                <p className="text-sm text-gray-500 inline-flex items-center gap-1.5 mt-0.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {session.durationMinutes} min
                                                    {session.recordingAvailable ? (
                                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                                            Recording
                                                        </span>
                                                    ) : (
                                                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs font-semibold">
                                                            <VideoOff className="w-3 h-3" />
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
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shrink-0"
                                                >
                                                    <PlayCircle className="w-4 h-4" />
                                                    Watch
                                                </button>
                                            ) : (
                                                <span className="text-sm text-gray-400 shrink-0">
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
                    <div className="relative z-[61] w-full max-w-4xl mx-4 bg-black rounded-2xl shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
                            <p className="text-sm text-white/90 font-medium truncate pr-4">
                                {activeLabel}
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveId(null)}
                                aria-label="Close recording"
                                className="w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors shrink-0"
                            >
                                <X className="w-5 h-5" />
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
