'use client'

import { useState } from 'react'
import {
    FileText,
    Calendar,
    User,
    ChevronDown,
    ChevronUp,
    Search,
    Lightbulb,
    CheckCircle2,
    Mail
} from 'lucide-react'

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
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Reports Yet</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by student or mentor name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filterType === 'all'
                                ? 'bg-accent text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterType('with_personalized')}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filterType === 'with_personalized'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Personalized
                    </button>
                    <button
                        onClick={() => setFilterType('without_personalized')}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filterType === 'without_personalized'
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Pending
                    </button>
                </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-500 mb-4">
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
                            className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-md"
                        >
                            {/* Report Header */}
                            <button
                                onClick={() => toggleReport(report.id)}
                                className="w-full p-5 flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* Status indicator */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${report.personalized_report
                                            ? 'bg-green-50'
                                            : 'bg-amber-50'
                                        }`}>
                                        {report.personalized_report ? (
                                            <Lightbulb className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <FileText className="w-5 h-5 text-amber-500" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900 truncate">
                                                {report.student_name}
                                            </span>
                                            <span className="text-gray-400">↔</span>
                                            <span className="font-medium text-gray-700 truncate">
                                                {report.mentor_name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                                            {sessionDate && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
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
                                                <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                                                    Personalized
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                                )}
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-5 pb-5 border-t border-gray-50 space-y-4">
                                    {/* Participants Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                        <div className="bg-blue-50/50 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <User className="w-4 h-4 text-blue-500" />
                                                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                                    Student
                                                </span>
                                            </div>
                                            <p className="font-medium text-gray-900">{report.student_name}</p>
                                            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                                <Mail className="w-3.5 h-3.5" />
                                                <span>{report.student_email || 'No email'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-purple-50/50 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <User className="w-4 h-4 text-purple-500" />
                                                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                                                    Mentor
                                                </span>
                                            </div>
                                            <p className="font-medium text-gray-900">{report.mentor_name}</p>
                                            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                                <Mail className="w-3.5 h-3.5" />
                                                <span>{report.mentor_email || 'No email'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personalized Report */}
                                    {report.personalized_report && (
                                        <div className="bg-gradient-to-br from-accent/5 to-blue-50 rounded-xl p-4">
                                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <Lightbulb className="w-5 h-5 text-amber-500" />
                                                Personalized Report
                                            </h4>
                                            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                                {report.personalized_report}
                                            </div>
                                            {report.personalized_report_generated_at && (
                                                <p className="mt-3 text-xs text-gray-400">
                                                    Generated on {new Date(report.personalized_report_generated_at).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Summary */}
                                    {report.summary && (
                                        <div>
                                            <h4 className="font-semibold text-gray-800 mb-2">Session Summary</h4>
                                            <p className="text-gray-600 text-sm leading-relaxed">{report.summary}</p>
                                        </div>
                                    )}

                                    {/* Key Points */}
                                    {report.key_points && report.key_points.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-gray-800 mb-2">Key Takeaways</h4>
                                            <ul className="space-y-1.5">
                                                {report.key_points.map((point, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                                        <div className="w-1.5 h-1.5 bg-accent rounded-full mt-2 shrink-0" />
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Action Items */}
                                    {report.action_items && report.action_items.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-gray-800 mb-2">Action Items</h4>
                                            <ul className="space-y-1.5">
                                                {report.action_items.map((action, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                        {action}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Mentor Form Response Preview */}
                                    {report.mentor_form_responses && (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <h4 className="font-semibold text-gray-800 mb-2">
                                                Mentor's Session Notes
                                            </h4>
                                            {report.mentor_form_submitted_at && (
                                                <p className="text-xs text-gray-400 mb-2">
                                                    Submitted on {new Date(report.mentor_form_submitted_at).toLocaleString()}
                                                </p>
                                            )}
                                            <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto bg-white p-3 rounded-lg border border-gray-100 max-h-48 overflow-y-auto">
                                                {JSON.stringify(report.mentor_form_responses, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Session & Report Metadata */}
                                    <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
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
                <div className="text-center py-8 text-gray-500">
                    No reports match your search criteria
                </div>
            )}
        </div>
    )
}
