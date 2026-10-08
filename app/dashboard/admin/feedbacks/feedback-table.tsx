'use client'

import { useState } from 'react'
import { Star, MagnifyingGlass as Search, CaretDown as ChevronDown, CaretUp as ChevronUp, FileText } from '@phosphor-icons/react/ssr'

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
            case 'Extremely helpful': return 'bg-tint-green text-tint-green-foreground'
            case 'Very helpful': return 'bg-tint-blue text-tint-blue-foreground'
            case 'Somewhat': return 'bg-tint-amber text-tint-amber-foreground'
            case 'Not at all': return 'bg-tint-rose text-tint-rose-foreground'
            default: return 'bg-muted text-muted-foreground'
        }
    }

    return (
        <div className="space-y-6">
            {/* Search */}
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

            {/* Table */}
            <div className="bg-card rounded-card border border-border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/60 border-b border-border">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Student</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Mentor</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Session date</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Rating</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Helpful?</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Submitted</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map((feedback) => (
                            <>
                                <tr key={feedback.id} className="hover:bg-muted/60 transition-colors">
                                    <td className="px-6 py-4 font-medium text-foreground">{feedback.studentName}</td>
                                    <td className="px-6 py-4 text-foreground">{feedback.mentorName}</td>
                                    <td className="px-6 py-4 text-muted-foreground text-sm">{formatDate(feedback.sessionDate)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    weight={star <= feedback.rating ? 'fill' : 'regular'}
                                                    className={`size-4 ${star <= feedback.rating
                                                        ? 'text-amber-400 fill-amber-400'
                                                        : 'text-muted-foreground/60'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${helpfulColor(feedback.helpful)}`}>
                                            {feedback.helpful}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-sm">{formatDate(feedback.submittedAt)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setExpandedId(expandedId === feedback.id ? null : feedback.id)}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center gap-1"
                                        >
                                            {(feedback.experience || feedback.transcript || feedback.summary || feedback.transcriptUrl) && (
                                                <FileText className="size-4" />
                                            )}
                                            {expandedId === feedback.id ? (
                                                <ChevronUp className="size-4" />
                                            ) : (
                                                <ChevronDown className="size-4" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                                {expandedId === feedback.id && feedback.experience && (
                                    <tr key={`${feedback.id}-exp`} className="bg-muted/60">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="p-4 bg-card rounded-control border border-border">
                                                <p className="text-sm font-semibold text-foreground mb-2">Experience feedback:</p>
                                                <p className="text-muted-foreground">{feedback.experience}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {expandedId === feedback.id && (feedback.transcript || feedback.summary || feedback.transcriptUrl) && (
                                    <tr key={`${feedback.id}-transcript`} className="bg-muted/60">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="p-4 bg-card rounded-control border border-border">
                                                <p className="text-sm font-semibold text-foreground mb-2">Session transcript:</p>
                                                {feedback.summary && (
                                                    <div className="mb-3 p-3 bg-tint-blue rounded-lg">
                                                        <p className="text-sm font-semibold text-tint-blue-foreground mb-1">Summary:</p>
                                                        <p className="text-muted-foreground text-sm">{feedback.summary}</p>
                                                    </div>
                                                )}
                                                {feedback.transcript && (
                                                    <div className="max-h-64 overflow-y-auto">
                                                        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/60 p-3 rounded-lg">
                                                            {feedback.transcript}
                                                        </pre>
                                                    </div>
                                                )}
                                                {feedback.transcriptUrl && !feedback.transcript && (
                                                    <a
                                                        href={feedback.sessionId ? `/api/transcript/${feedback.sessionId}` : feedback.transcriptUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline text-sm"
                                                    >
                                                        View transcript
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
                                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
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
