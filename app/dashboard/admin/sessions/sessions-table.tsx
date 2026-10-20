'use client'

import { useState } from 'react'
import { MagnifyingGlass as Search, FileText, ArrowSquareOut as ExternalLink } from '@phosphor-icons/react/ssr'

interface SessionRow {
    id: string
    scheduledAt: string | null
    studentName: string
    mentorName: string
    transcriptUrl: string | null
}

interface Props {
    sessions: SessionRow[]
}

export default function AdminSessionsTable({ sessions }: Props) {
    const [search, setSearch] = useState('')

    const filtered = sessions.filter(s =>
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.mentorName.toLowerCase().includes(search.toLowerCase())
    )

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (sessions.length === 0) {
        return (
            <div className="bg-card rounded-card border border-border p-12 text-center">
                <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="size-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No completed sessions</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    Completed sessions will appear here with transcript links once they are available.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by mentor or student name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-12"
                />
            </div>

            <div className="bg-card rounded-card border border-border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/60 border-b border-border">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Student</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Mentor</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Session date</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">Transcript</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map((session) => (
                            <tr key={session.id} className="hover:bg-muted/60 transition-colors">
                                <td className="px-6 py-4 font-medium text-foreground">{session.studentName}</td>
                                <td className="px-6 py-4 text-foreground">{session.mentorName}</td>
                                <td className="px-6 py-4 text-muted-foreground text-sm">{formatDate(session.scheduledAt)}</td>
                                <td className="px-6 py-4 text-right">
                                    {session.transcriptUrl ? (
                                        <a
                                            href={`/api/transcript/${session.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium"
                                        >
                                            <ExternalLink className="size-4" />
                                            View transcript
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">Processing…</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No matching sessions</p>
            )}
        </div>
    )
}
