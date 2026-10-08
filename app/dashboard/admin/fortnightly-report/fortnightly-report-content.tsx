'use client'

import { useState } from 'react'
import { CalendarBlank as CalendarRange, Envelope as Mail, User, PaperPlaneRight as Send, CircleNotch as Loader2, CheckCircle as CheckCircle2, XCircle, Eye, FileText, ArrowSquareOut as ExternalLink } from '@phosphor-icons/react/ssr'

interface StudentRow {
    id: string
    full_name: string
    email: string | null
    parent_email: string | null
    sessionCount: number
}

interface FortnightlyReportContentProps {
    students: StudentRow[]
    defaultEndDate: string
}

interface SendResult {
    studentId: string
    studentName: string
    studentEmail?: string
    parentEmail?: string
    sentToStudent: boolean
    sentToParent: boolean
    error?: string
    studentSubject?: string
    parentSubject?: string
    studentReportHtml?: string
    parentReportHtml?: string
}

export default function FortnightlyReportContent({ students, defaultEndDate }: FortnightlyReportContentProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(students.map(s => s.id)))
    const [sending, setSending] = useState(false)
    const [result, setResult] = useState<{ periodLabel: string; results: SendResult[] } | null>(null)
    const [previewStudent, setPreviewStudent] = useState<{ id: string; name: string } | null>(null)
    const [previewStudentHtml, setPreviewStudentHtml] = useState<string | null>(null)
    const [previewParentHtml, setPreviewParentHtml] = useState<string | null>(null)
    const [previewStudentSubject, setPreviewStudentSubject] = useState<string | null>(null)
    const [previewParentSubject, setPreviewParentSubject] = useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [previewError, setPreviewError] = useState<string | null>(null)
    const [previewTab, setPreviewTab] = useState<'student' | 'parent'>('student')

    const toggleAll = () => {
        if (selectedIds.size === students.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(students.map(s => s.id)))
        }
    }

    const toggleOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSend = async () => {
        setSending(true)
        setResult(null)
        try {
            const res = await fetch('/api/fortnightly-report/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentIds: selectedIds.size === students.length ? undefined : Array.from(selectedIds)
                })
            })
            const data = await res.json()
            if (!res.ok) {
                setResult({
                    periodLabel: '',
                    results: [{ studentId: '', studentName: '', sentToStudent: false, sentToParent: false, error: data.error || res.statusText }]
                })
                return
            }
            setResult({ periodLabel: data.periodLabel || '', results: data.results || [] })
        } catch (e) {
            setResult({
                periodLabel: '',
                results: [{ studentId: '', studentName: '', sentToStudent: false, sentToParent: false, error: String(e) }]
            })
        } finally {
            setSending(false)
        }
    }

    const handlePreview = async (student: { id: string; name: string }) => {
        setPreviewStudent(student)
        setPreviewTab('student')
        setPreviewStudentHtml(null)
        setPreviewParentHtml(null)
        setPreviewError(null)
        setPreviewLoading(true)

        try {
            const res = await fetch('/api/fortnightly-report/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentIds: [student.id],
                    previewOnly: true
                })
            })
            const data = await res.json()
            if (!res.ok) {
                setPreviewError(data.error || res.statusText || 'Failed to generate preview')
                return
            }

            const first = (data.results || [])[0] as SendResult | undefined

            if (!first) {
                setPreviewError('No report data returned for this student.')
                return
            }

            setPreviewStudentHtml(first.studentReportHtml || null)
            setPreviewParentHtml(first.parentReportHtml || null)
            setPreviewStudentSubject(first.studentSubject || null)
            setPreviewParentSubject(first.parentSubject || null)
        } catch (e) {
            setPreviewError(String(e))
        } finally {
            setPreviewLoading(false)
        }
    }

    const closePreview = () => {
        setPreviewStudent(null)
        setPreviewStudentHtml(null)
        setPreviewParentHtml(null)
        setPreviewStudentSubject(null)
        setPreviewParentSubject(null)
        setPreviewError(null)
        setPreviewLoading(false)
    }

    const handleViewAllReports = (student: StudentRow) => {
        const url = '/dashboard/admin/reports'
        window.open(url, '_blank')
    }

    if (students.length === 0) {
        return (
            <div className="bg-card rounded-card border border-border p-12 text-center">
                <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarRange className="size-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No sessions in this period</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    There are no student sessions in this 14-day period. Reports will be available once sessions are completed in the period.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-card border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-semibold text-foreground">Students with sessions in period</h2>
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-sm text-primary hover:underline"
                    >
                        {selectedIds.size === students.length ? 'Deselect all' : 'Select all'}
                    </button>
                </div>
                <ul className="divide-y divide-border">
                    {students.map(s => (
                        <li key={s.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center hover:bg-muted/60">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(s.id)}
                                    onChange={() => toggleOne(s.id)}
                                    className="rounded border-border text-primary focus:ring-primary"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <User className="size-4 text-muted-foreground shrink-0" />
                                        <span className="font-medium text-foreground">{s.full_name}</span>
                                        <span className="text-sm text-muted-foreground">({s.sessionCount} session{s.sessionCount !== 1 ? 's' : ''})</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                                        {s.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="size-3.5" /> Student: {s.email}
                                            </span>
                                        )}
                                        {s.parent_email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="size-3.5" /> Parent: {s.parent_email}
                                            </span>
                                        )}
                                        {!s.email && !s.parent_email && (
                                            <span className="text-warning">No email on file</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleViewAllReports(s)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/60"
                                >
                                    <FileText className="size-3.5" />
                                    View all reports
                                    <ExternalLink className="size-3" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePreview({ id: s.id, name: s.full_name })}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary/30 text-xs font-medium text-primary hover:bg-primary/5"
                                >
                                    <Eye className="size-3.5" />
                                    View fortnightly report
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || selectedIds.size === 0}
                    className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 text-base in-data-[density=compact]:h-9 in-data-[density=compact]:px-4 in-data-[density=compact]:text-sm"
                >
                    {sending ? (
                        <>
                            <Loader2 className="size-5 animate-spin" />
                            Generating & sending…
                        </>
                    ) : (
                        <>
                            <Send className="size-5" />
                            Generate & send to {selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''}
                        </>
                    )}
                </button>
                <p className="text-sm text-muted-foreground">
                    Each selected student will receive an AI-generated consolidated report by email; if a parent email is set, the parent will receive a separate version with a parent-friendly tone.
                </p>
            </div>

            {result && (
                <div className="bg-card rounded-card border border-border p-6">
                    <h2 className="font-semibold text-foreground mb-4">Result</h2>
                    {result.periodLabel && (
                        <p className="text-sm text-muted-foreground mb-4">Period: {result.periodLabel}</p>
                    )}
                    <ul className="space-y-3">
                        {result.results.map((r, i) => (
                            <li key={r.studentId || i} className="flex items-start gap-3 text-sm">
                                {r.error ? (
                                    <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                                ) : (
                                    <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <span className="font-medium text-foreground">{r.studentName || 'Unknown'}</span>
                                    {r.error && <span className="text-destructive ml-2">{r.error}</span>}
                                    {!r.error && (
                                        <span className="text-muted-foreground ml-2">
                                            Student: {r.sentToStudent ? 'sent' : 'not sent'}
                                            {r.parentEmail != null && ` · Parent: ${r.sentToParent ? 'sent' : 'not sent'}`}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {previewStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="border border-transparent bg-card rounded-card shadow-border w-full max-w-5xl max-h-[90vh] flex flex-col">
                        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-foreground">Fortnightly report preview</h3>
                                <p className="text-xs text-muted-foreground">Student: {previewStudent.name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closePreview}
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Close
                            </button>
                        </div>
                        <div className="px-5 pt-3 flex gap-2 border-b border-border">
                            <button
                                type="button"
                                onClick={() => setPreviewTab('student')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full ${previewTab === 'student'
                                    ? 'bg-primary text-white'
                                    : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                Student version
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('parent')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full ${previewTab === 'parent'
                                    ? 'bg-primary text-white'
                                    : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                Parent version
                            </button>
                        </div>
                        <div className="p-5 flex-1 overflow-auto min-w-0 flex flex-col">
                            {previewLoading && (
                                <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
                                    <Loader2 className="size-4 animate-spin mr-2" />
                                    Generating preview…
                                </div>
                            )}
                            {!previewLoading && previewError && (
                                <div className="text-sm text-destructive">{previewError}</div>
                            )}
                            {!previewLoading && !previewError && (
                                <div className="flex-1 min-h-0 flex flex-col gap-3">
                                    <div className="text-sm text-muted-foreground shrink-0">
                                        <span className="font-medium text-foreground">Subject:</span>{' '}
                                        {previewTab === 'student'
                                            ? (previewStudentSubject || 'Your Fortnightly Progress Report')
                                            : (previewParentSubject || 'Fortnightly Progress Report')}
                                    </div>
                                    <div className="flex-1 min-h-0 rounded-lg overflow-hidden" aria-label="Email preview">
                                        <iframe
                                            title={previewTab === 'student' ? 'Student report email preview' : 'Parent report email preview'}
                                            srcDoc={
                                                (previewTab === 'student' ? previewStudentHtml : previewParentHtml) ||
                                                '<p style="padding:2rem;color:#6b7280">No report generated.</p>'
                                            }
                                            className="w-full h-full min-h-[70vh] border-0"
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
