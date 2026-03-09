'use client'

import { useState } from 'react'
import { Search, FileText, ExternalLink } from 'lucide-react'

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
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Completed Sessions</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    Completed sessions will appear here with transcript links once they are available.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by mentor or student name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Student</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Mentor</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Session Date</th>
                            <th className="text-right px-6 py-4 text-sm font-bold text-gray-600">Transcript</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map((session) => (
                            <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{session.studentName}</td>
                                <td className="px-6 py-4 text-gray-700">{session.mentorName}</td>
                                <td className="px-6 py-4 text-gray-500 text-sm">{formatDate(session.scheduledAt)}</td>
                                <td className="px-6 py-4 text-right">
                                    {session.transcriptUrl ? (
                                        <a
                                            href={`/api/transcript/${session.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-accent hover:underline text-sm font-medium"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            View Transcript
                                        </a>
                                    ) : (
                                        <span className="text-gray-400 text-sm">Processing…</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <p className="text-center text-gray-500 py-8">No matching sessions</p>
            )}
        </div>
    )
}
