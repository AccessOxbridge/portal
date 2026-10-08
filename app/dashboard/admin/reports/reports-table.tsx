'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
    FileText,
    CalendarBlank as Calendar,
    User,
    CaretDown as ChevronDown,
    CaretUp as ChevronUp,
    MagnifyingGlass as Search,
    Lightbulb,
    CheckCircle as CheckCircle2,
    Envelope as Mail,
} from '@phosphor-icons/react/ssr'

interface ReportData {
    id: string
    session_id: string
    student_name: string
    student_email: string
    mentor_name: string
    mentor_email: string
    session_date: string | null
    session_status: string
    summary: string | null
    key_points: string[] | null
    action_items: string[] | null
    personalized_report: string | null
    personalized_report_generated_at: string | null
    mentor_form_submitted_at: string | null
    mentor_form_responses: any
    created_at: string | null
}

interface AdminReportsTableProps {
    reports: ReportData[]
}

export default function AdminReportsTable({ reports }: AdminReportsTableProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
    const [filterType, setFilterType] = useState<'all' | 'with_personalized' | 'without_personalized'>('all')

    const toggleReport = (reportId: string) => {
        setExpandedReports(prev => {
            const newSet = new Set(prev)
            if (newSet.has(reportId)) {
                newSet.delete(reportId)
            } else {
                newSet.add(reportId)
            }
            return newSet
        })
    }

    // Filter reports based on search and filter type
    const filteredReports = reports.filter(report => {
        const matchesSearch =
            report.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.mentor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.student_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.mentor_email.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesFilter =
            filterType === 'all' ||
            (filterType === 'with_personalized' && report.personalized_report) ||
            (filterType === 'without_personalized' && !report.personalized_report)

        return matchesSearch && matchesFilter
    })

    if (reports.length === 0) {
        return (
            <div className="bg-card rounded-card border border-border p-12 text-center">
                <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="size-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No reports yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    Session reports will appear here once mentors complete their post-session forms.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by student or mentor name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2.5 rounded-control text-sm font-medium transition-[background-color,box-shadow,color] duration-150 ${filterType === 'all'
                                ? 'bg-primary text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterType('with_personalized')}
                        className={`px-4 py-2.5 rounded-control text-sm font-medium transition-[background-color,box-shadow,color] duration-150 ${filterType === 'with_personalized'
                                ? 'bg-success text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        Personalised
                    </button>
                    <button
                        onClick={() => setFilterType('without_personalized')}
                        className={`px-4 py-2.5 rounded-control text-sm font-medium transition-[background-color,box-shadow,color] duration-150 ${filterType === 'without_personalized'
                                ? 'bg-warning text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        Pending
                    </button>
                </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-muted-foreground mb-4">
                Showing {filteredReports.length} of {reports.length} reports
            </div>

            {/* Reports List */}
            <div className="space-y-3">
                {filteredReports.map((report) => {
                    const isExpanded = expandedReports.has(report.id)
                    const sessionDate = report.session_date ? new Date(report.session_date) : null

                    return (
                        <div
                            key={report.id}
                            className="bg-card rounded-card border border-border overflow-hidden transition-[background-color,box-shadow,color] duration-150 hover:shadow-border"
                        >
                            {/* Report Header */}
                            <button
                                onClick={() => toggleReport(report.id)}
                                className="w-full p-5 flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* Status indicator */}
                                    <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${report.personalized_report
                                            ? 'bg-tint-green'
                                            : 'bg-tint-amber'
                                        }`}>
                                        {report.personalized_report ? (
                                            <Lightbulb className="size-5 text-success" />
                                        ) : (
                                            <FileText className="size-5 text-warning" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-foreground truncate">
                                                {report.student_name}
                                            </span>
                                            <span className="text-muted-foreground">↔</span>
                                            <span className="font-medium text-foreground truncate">
                                                {report.mentor_name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                            {sessionDate && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="size-3.5" />
                                                    <span>
                                                        {sessionDate.toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                            {report.personalized_report && (
                                                <span className="px-2 py-0.5 bg-tint-green text-success text-xs font-medium rounded-full">
                                                    Personalised
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded ? (
                                    <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                                ) : (
                                    <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                                )}
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-5 pb-5 border-t border-border space-y-4">
                                    {/* Participants Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                        <div className="bg-tint-blue/50 rounded-control p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <User className="size-4 text-brand" />
                                                <span className="text-xs font-semibold text-brand">
                                                    Student
                                                </span>
                                            </div>
                                            <p className="font-medium text-foreground">{report.student_name}</p>
                                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                                <Mail className="size-3.5" />
                                                <span>{report.student_email || 'No email'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-tint-violet/60 rounded-control p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <User className="size-4 text-tint-violet-foreground" />
                                                <span className="text-xs font-semibold text-tint-violet-foreground">
                                                    Mentor
                                                </span>
                                            </div>
                                            <p className="font-medium text-foreground">{report.mentor_name}</p>
                                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                                <Mail className="size-3.5" />
                                                <span>{report.mentor_email || 'No email'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personalised Report */}
                                    {report.personalized_report && (
                                        <div className="bg-tint-blue rounded-control p-4">
                                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <Lightbulb className="size-5 text-warning" />
                                                Personalised report
                                            </h4>
                                            <div className="prose prose-sm max-w-none text-foreground prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-h2:mt-4 prose-h2:mb-2 prose-h2:font-semibold prose-h2:text-foreground max-h-64 overflow-y-auto">
                                                <ReactMarkdown>{report.personalized_report}</ReactMarkdown>
                                            </div>
                                            {report.personalized_report_generated_at && (
                                                <p className="mt-3 text-xs text-muted-foreground">
                                                    Generated on {new Date(report.personalized_report_generated_at).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Summary */}
                                    {report.summary && (
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-2">Session summary</h4>
                                            <p className="text-muted-foreground text-sm leading-relaxed">{report.summary}</p>
                                        </div>
                                    )}

                                    {/* Key Points */}
                                    {report.key_points && report.key_points.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-2">Key takeaways</h4>
                                            <ul className="space-y-1.5">
                                                {report.key_points.map((point, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                        <div className="size-1.5 bg-primary rounded-full mt-2 shrink-0" />
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Action Items */}
                                    {report.action_items && report.action_items.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-2">Action items</h4>
                                            <ul className="space-y-1.5">
                                                {report.action_items.map((action, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                        <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                                                        {action}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Mentor Form Response Preview */}
                                    {report.mentor_form_responses && (
                                        <div className="bg-muted/60 rounded-control p-4">
                                            <h4 className="font-semibold text-foreground mb-2">
                                                Mentor&apos;s session notes
                                            </h4>
                                            {report.mentor_form_submitted_at && (
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    Submitted on {new Date(report.mentor_form_submitted_at).toLocaleString()}
                                                </p>
                                            )}
                                            {typeof report.mentor_form_responses === 'object' ? (
                                                <div className="space-y-2 text-sm text-foreground">
                                                    {'topics_covered' in report.mentor_form_responses && (
                                                        <p>
                                                            <span className="font-semibold">Topics covered: </span>
                                                            {report.mentor_form_responses.topics_covered}
                                                        </p>
                                                    )}
                                                    {'overall_rating' in report.mentor_form_responses && (
                                                        <p>
                                                            <span className="font-semibold">Overall rating: </span>
                                                            {report.mentor_form_responses.overall_rating}
                                                        </p>
                                                    )}
                                                    {'student_engagement' in report.mentor_form_responses && (
                                                        <p>
                                                            <span className="font-semibold">Student engagement: </span>
                                                            {report.mentor_form_responses.student_engagement}
                                                        </p>
                                                    )}
                                                    {'areas_of_improvement' in report.mentor_form_responses && (
                                                        <p>
                                                            <span className="font-semibold">Areas of improvement: </span>
                                                            {report.mentor_form_responses.areas_of_improvement}
                                                        </p>
                                                    )}
                                                    {'next_steps' in report.mentor_form_responses && (
                                                        <p>
                                                            <span className="font-semibold">Next steps: </span>
                                                            {report.mentor_form_responses.next_steps}
                                                        </p>
                                                    )}
                                                    {'additional_notes' in report.mentor_form_responses && (
                                                        <p>
                                                            <span className="font-semibold">Additional notes: </span>
                                                            {report.mentor_form_responses.additional_notes}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                                    {String(report.mentor_form_responses)}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Session & Report Metadata */}
                                    <div className="pt-3 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                                        <span>Report ID: {report.id.slice(0, 8)}...</span>
                                        <span>Session ID: {report.session_id.slice(0, 8)}...</span>
                                        {report.created_at && (
                                            <span>Created: {new Date(report.created_at).toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {filteredReports.length === 0 && reports.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    No reports match your search criteria
                </div>
            )}
        </div>
    )
}
