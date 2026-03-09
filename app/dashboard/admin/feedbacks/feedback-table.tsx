'use client'

import { useState } from 'react'
import { Star, Search, ChevronDown, ChevronUp, FileText } from 'lucide-react'

interface Feedback {
    id: string
    sessionId: string | null
    studentName: string
    mentorName: string
    mentorId: string
    rating: number
    helpful: string
    experience: string
    sessionDate: string | null
    submittedAt: string | null
    transcript: string | null
    transcriptUrl: string | null
    summary: string | null
}

interface Props {
    feedbacks: Feedback[]
}

export default function FeedbackTable({ feedbacks }: Props) {
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const filtered = feedbacks.filter(f =>
        f.mentorName.toLowerCase().includes(search.toLowerCase()) ||
        f.studentName.toLowerCase().includes(search.toLowerCase())
    )

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const helpfulColor = (value: string) => {
        switch (value) {
            case 'Extremely helpful': return 'bg-green-100 text-green-700'
            case 'Very helpful': return 'bg-blue-100 text-blue-700'
            case 'Somewhat': return 'bg-amber-100 text-amber-700'
            case 'Not at all': return 'bg-red-100 text-red-700'
            default: return 'bg-gray-100 text-gray-600'
        }
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Feedbacks</p>
                    <p className="text-3xl font-black text-accent">{feedbacks.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Average Rating</p>
                    <p className="text-3xl font-black text-amber-500">
                        {feedbacks.length > 0
                            ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
                            : '-'}
                        <span className="text-lg text-gray-400 ml-1">/ 5</span>
                    </p>
                </div>
            </div>

            {/* Search */}
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

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Student</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Mentor</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Session Date</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Rating</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Helpful?</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Submitted</th>
                            <th className="text-right px-6 py-4 text-sm font-bold text-gray-600">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map((feedback) => (
                            <>
                                <tr key={feedback.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{feedback.studentName}</td>
                                    <td className="px-6 py-4 text-gray-700">{feedback.mentorName}</td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{formatDate(feedback.sessionDate)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-4 h-4 ${star <= feedback.rating
                                                        ? 'text-amber-400 fill-amber-400'
                                                        : 'text-gray-200'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${helpfulColor(feedback.helpful)}`}>
                                            {feedback.helpful}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{formatDate(feedback.submittedAt)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setExpandedId(expandedId === feedback.id ? null : feedback.id)}
                                            className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors inline-flex items-center gap-1"
                                        >
                                            {(feedback.experience || feedback.transcript || feedback.summary || feedback.transcriptUrl) && (
                                                <FileText className="w-4 h-4" />
                                            )}
                                            {expandedId === feedback.id ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                                {expandedId === feedback.id && feedback.experience && (
                                    <tr key={`${feedback.id}-exp`} className="bg-gray-50">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="p-4 bg-white rounded-xl border border-gray-100">
                                                <p className="text-sm font-bold text-gray-700 mb-2">Experience Feedback:</p>
                                                <p className="text-gray-600">{feedback.experience}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {expandedId === feedback.id && (feedback.transcript || feedback.summary || feedback.transcriptUrl) && (
                                    <tr key={`${feedback.id}-transcript`} className="bg-gray-50">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="p-4 bg-white rounded-xl border border-gray-100">
                                                <p className="text-sm font-bold text-gray-700 mb-2">Session Transcript:</p>
                                                {feedback.summary && (
                                                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                                                        <p className="text-sm font-semibold text-blue-700 mb-1">Summary:</p>
                                                        <p className="text-gray-600 text-sm">{feedback.summary}</p>
                                                    </div>
                                                )}
                                                {feedback.transcript && (
                                                    <div className="max-h-64 overflow-y-auto">
                                                        <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-lg">
                                                            {feedback.transcript}
                                                        </pre>
                                                    </div>
                                                )}
                                                {feedback.transcriptUrl && !feedback.transcript && (
                                                    <a
                                                        href={feedback.sessionId ? `/api/transcript/${feedback.sessionId}` : feedback.transcriptUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-accent hover:underline text-sm"
                                                    >
                                                        View Transcript →
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    {feedbacks.length === 0 ? 'No feedback received yet' : 'No matching results'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
