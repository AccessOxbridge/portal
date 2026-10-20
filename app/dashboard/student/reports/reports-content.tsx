'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, CalendarBlank as Calendar, User, CaretDown as ChevronDown, CaretUp as ChevronUp, ChatCircle as MessageCircle } from '@phosphor-icons/react/ssr'
import { buttonVariants } from '@/components/ui/button'
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
            <div className="rounded-card bg-card px-6 py-12 text-center shadow-border">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                    <FileText weight="duotone" className="size-7" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No reports yet</h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground text-pretty">
                    Reports will appear here after your mentorship sessions are completed
                    and your mentor submits their feedback.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {reports.map((item) => {
                const isExpanded = expandedReports.has(item.report.id)
                const sessionDate = new Date(item.scheduled_at)
                let isFirstParagraph = true

                return (
                    <div
                        key={item.report.id}
                        className="overflow-hidden rounded-card bg-card shadow-border transition-shadow duration-150 ease-out hover:shadow-border-hover"
                    >
                        {/* Report Header */}
                        {/* The title button stretches over the whole header, so the
                            header still opens the report while "Chat with mentor"
                            stays a separate button rather than one nested inside it. */}
                        <div className="relative flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5">
                            <div className="flex min-w-0 items-center gap-3.5">
                                {/* Mentor Avatar */}
                                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-tint-blue outline-1 -outline-offset-1 outline-black/10">
                                    {item.mentor_photo_url ? (
                                        <img
                                            src={item.mentor_photo_url}
                                            alt={item.mentor_full_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User weight="duotone" className="size-6 text-tint-blue-foreground" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-foreground">
                                        <button
                                            type="button"
                                            onClick={() => toggleReport(item.report.id)}
                                            aria-expanded={isExpanded}
                                            className="text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-[3px] focus-visible:after:ring-inset focus-visible:after:ring-ring/40"
                                        >
                                            Session with {item.mentor_full_name}
                                        </button>
                                    </h3>
                                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Calendar className="size-4 shrink-0" />
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
                                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground text-pretty">
                                            {reportPreviewText(sanitizeReportContent(item.report.personalized_report))}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => handleChatWithMentor(e, item.mentor_id)}
                                    disabled={chatLoadingMentorId === item.mentor_id}
                                    className="relative z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-tint-blue px-3 py-1.5 text-xs font-medium text-tint-blue-foreground transition-colors duration-150 hover:bg-tint-blue/70 disabled:opacity-50"
                                >
                                    <MessageCircle weight="fill" className="size-3.5" />
                                    {chatLoadingMentorId === item.mentor_id ? 'Opening…' : 'Chat with mentor'}
                                </button>
                                {item.report.personalized_report && (
                                    <span className="hidden rounded-full bg-tint-green px-2.5 py-1 text-xs font-medium text-tint-green-foreground sm:inline">
                                        Personalised
                                    </span>
                                )}
                                {isExpanded ? (
                                    <ChevronUp className="size-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="size-5 text-muted-foreground" />
                                )}
                            </div>
                        </div>

                        {/* Expanded Report Content — only the personalized report (what was written) */}
                        {isExpanded && (
                            <div className="border-t border-border px-4 pb-5 animate-in fade-in-0 duration-200 motion-reduce:animate-none sm:px-5">
                                {item.report.personalized_report ? (
                                    <>
                                        <div className="mt-4 rounded-card bg-muted/50 p-5 sm:p-6">
                                            <div className="max-w-prose space-y-6 leading-relaxed text-foreground">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        h2: ({ children }) => (
                                                            <h2 className="mt-6 mb-3 border-b border-border pb-2 text-base font-semibold text-foreground first:mt-0">
                                                                {children}
                                                            </h2>
                                                        ),
                                                        p: ({ children }) => {
                                                            const raw = String(children ?? '').trim()
                                                            const isBestRegards = raw.toLowerCase().startsWith('best regards')
                                                            const isNameLine = !isBestRegards && raw.length > 0 && !raw.endsWith('.')
                                                            const base = 'text-base text-pretty'
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
                                                            <li className="pl-1 text-base">{children}</li>
                                                        ),
                                                    }}
                                                >
                                                    {normalizeReportMarkdown(sanitizeReportContent(item.report.personalized_report))}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                                            {item.report.personalized_report_generated_at && (
                                                <span className="text-sm text-muted-foreground">
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
                                                className={buttonVariants()}
                                            >
                                                <MessageCircle weight="fill" />
                                                {chatLoadingMentorId === item.mentor_id ? 'Opening…' : 'Chat with mentor'}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <p className="mt-4 text-sm text-muted-foreground">No personalised report for this session yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
