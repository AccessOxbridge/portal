'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { FileText, Calendar, User, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'

interface Report {
    id: string
    summary: string | null
    key_points: string[] | null
    action_items: string[] | null
    personalized_report: string | null
    personalized_report_generated_at: string | null
    created_at: string
}

interface ReportData {
    session_id: string
    scheduled_at: string
    mentor_full_name: string
    mentor_photo_url: string | null
    report: Report
}

interface ReportsContentProps {
    reports: ReportData[]
}

export default function ReportsContent({ reports }: ReportsContentProps) {
    const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())

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

    if (reports.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Reports Yet</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    Reports will appear here after your mentorship sessions are completed
                    and your mentor submits their feedback.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {reports.map((item) => {
                const isExpanded = expandedReports.has(item.report.id)
                const sessionDate = new Date(item.scheduled_at)

                return (
                    <div
                        key={item.report.id}
                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-md"
                    >
                        {/* Report Header */}
                        <button
                            onClick={() => toggleReport(item.report.id)}
                            className="w-full p-5 flex items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-4">
                                {/* Mentor Avatar */}
                                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {item.mentor_photo_url ? (
                                        <img
                                            src={item.mentor_photo_url}
                                            alt={item.mentor_full_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-6 h-6 text-accent" />
                                    )}
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        Session with {item.mentor_full_name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            {sessionDate.toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {item.report.personalized_report && (
                                    <span className="px-2.5 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                                        Personalized
                                    </span>
                                )}
                                {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </div>
                        </button>

                        {/* Expanded Report Content */}
                        {isExpanded && (
                            <div className="px-5 pb-5 border-t border-gray-50">
                                {/* Personalized Report */}
                                {item.report.personalized_report && (
                                    <div className="mt-4 p-4 bg-gradient-to-br from-accent/5 to-blue-50 rounded-xl">
                                        <div className="prose prose-sm max-w-none text-gray-700 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-h2:mt-4 prose-h2:mb-2 prose-h2:font-semibold prose-h2:text-gray-800">
                                            <ReactMarkdown>{item.report.personalized_report}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Summary */}
                                {item.report.summary && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-gray-800 mb-2">Session Summary</h4>
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            {item.report.summary}
                                        </p>
                                    </div>
                                )}

                                {/* Key Points */}
                                {item.report.key_points && item.report.key_points.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-gray-800 mb-2">Key Takeaways</h4>
                                        <ul className="space-y-2">
                                            {item.report.key_points.map((point, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <div className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Action Items */}
                                {item.report.action_items && item.report.action_items.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-gray-800 mb-2">Action Items</h4>
                                        <ul className="space-y-2">
                                            {item.report.action_items.map((action, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                    {action}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Report Generated Date */}
                                {item.report.personalized_report_generated_at && (
                                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                                        Report generated on {new Date(item.report.personalized_report_generated_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
