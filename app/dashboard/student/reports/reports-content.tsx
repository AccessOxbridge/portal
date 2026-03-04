'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Calendar, User, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { sanitizeReportContent, normalizeReportMarkdown } from '@/lib/report-utils'

/** Plain-text preview from markdown (strip headers, bold, etc.) for collapsed preview. */
function reportPreviewText(md: string | null, maxLen: number = 120): string {
    if (!md) return ''
    const plain = md
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\n+/g, ' ')
        .trim()
    if (plain.length <= maxLen) return plain
    return plain.slice(0, maxLen).trim() + '…'
}

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
    mentor_id: string
    mentor_full_name: string
    mentor_photo_url: string | null
    report: Report
}

interface ReportsContentProps {
    reports: ReportData[]
    studentFirstName?: string
}

export default function ReportsContent({ reports, studentFirstName }: ReportsContentProps) {
    const router = useRouter()
    const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
    const [chatLoadingMentorId, setChatLoadingMentorId] = useState<string | null>(null)

    const handleChatWithMentor = async (e: React.MouseEvent, mentorId: string) => {
        e.preventDefault()
        e.stopPropagation()
        setChatLoadingMentorId(mentorId)
        const supabase = createClient()
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: existingConv } = await supabase
                .from('conversations')
                .select('id')
                .eq('student_id', user.id)
                .eq('mentor_id', mentorId)
                .maybeSingle()
            if (!existingConv) {
                await supabase.from('conversations').insert({
                    student_id: user.id,
                    mentor_id: mentorId
                })
            }
            router.push(`/dashboard/student/messages?mentor=${encodeURIComponent(mentorId)}`)
        } catch (err) {
            console.error('Failed to open chat:', err)
            router.push('/dashboard/student/messages')
        } finally {
            setChatLoadingMentorId(null)
        }
    }

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
                let isFirstParagraph = true

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

                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-gray-900">
                                        Session with {item.mentor_full_name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                        <Calendar className="w-4 h-4 flex-shrink-0" />
                                        <span>
                                            {sessionDate.toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    {!isExpanded && item.report.personalized_report && (
                                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                                            {reportPreviewText(sanitizeReportContent(item.report.personalized_report))}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => handleChatWithMentor(e, item.mentor_id)}
                                    disabled={chatLoadingMentorId === item.mentor_id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent hover:bg-accent/20 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    {chatLoadingMentorId === item.mentor_id ? 'Opening…' : 'Chat with mentor'}
                                </button>
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

                        {/* Expanded Report Content — only the personalized report (what was written) */}
                        {isExpanded && (
                            <div className="px-5 pb-6 border-t border-gray-100">
                                {item.report.personalized_report ? (
                                    <>
                                        <div className="mt-5 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                                            <div className="text-gray-700 leading-relaxed space-y-6">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        h2: ({ children }) => (
                                                            <h2 className="text-base font-semibold text-gray-900 mt-6 mb-3 first:mt-0 pb-2 border-b border-gray-200">
                                                                {children}
                                                            </h2>
                                                        ),
                                                        p: ({ children }) => {
                                                            const raw = String(children ?? '').trim()
                                                            const isBestRegards = raw.toLowerCase().startsWith('best regards')
                                                            const isNameLine = !isBestRegards && raw.length > 0 && !raw.endsWith('.')
                                                            const base = 'text-[15px]'
                                                            // First paragraph greeting: prepend "Hi {FirstName}," if not present
                                                            if (isFirstParagraph) {
                                                                isFirstParagraph = false
                                                                if (studentFirstName && raw.length > 0 && !/^hi\\b|^hello\\b/i.test(raw)) {
                                                                    const firstChar = raw.charAt(0)
                                                                    const rest = raw.slice(1)
                                                                    const normalized =
                                                                        firstChar ? firstChar.toLowerCase() + rest : raw
                                                                    const withGreeting = `Hi ${studentFirstName}, ${normalized}`
                                                                    return (
                                                                        <p className={`my-3 ${base}`}>
                                                                            {withGreeting}
                                                                        </p>
                                                                    )
                                                                }
                                                            }
                                                            if (isBestRegards) {
                                                                return (
                                                                    <p className={`mt-7 mb-1 ${base}`}>
                                                                        {children}
                                                                    </p>
                                                                )
                                                            }
                                                            if (isNameLine) {
                                                                return (
                                                                    <p className={`mt-1 ${base}`}>
                                                                        {children}
                                                                    </p>
                                                                )
                                                            }
                                                            return (
                                                                <p className={`my-3 ${base}`}>
                                                                    {children}
                                                                </p>
                                                            )
                                                        },
                                                        ul: ({ children }) => (
                                                            <ul className="my-4 list-disc pl-6 space-y-2">{children}</ul>
                                                        ),
                                                        ol: ({ children }) => (
                                                            <ol className="my-4 list-decimal pl-6 space-y-2">{children}</ol>
                                                        ),
                                                        li: ({ children }) => (
                                                            <li className="text-[15px] pl-1">{children}</li>
                                                        ),
                                                    }}
                                                >
                                                    {normalizeReportMarkdown(sanitizeReportContent(item.report.personalized_report))}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                                            {item.report.personalized_report_generated_at && (
                                                <span className="text-xs text-gray-400">
                                                    Report generated on {new Date(item.report.personalized_report_generated_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => handleChatWithMentor(e, item.mentor_id)}
                                                disabled={chatLoadingMentorId === item.mentor_id}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 shadow-sm"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                {chatLoadingMentorId === item.mentor_id ? 'Opening…' : 'Chat with mentor'}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <p className="mt-4 text-sm text-gray-500">No personalized report for this session yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
