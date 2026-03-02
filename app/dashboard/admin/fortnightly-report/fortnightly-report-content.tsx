'use client'

import { useState } from 'react'
import { CalendarRange, Mail, User, Send, Loader2, CheckCircle2, XCircle, Eye, FileText, ExternalLink } from 'lucide-react'

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
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarRange className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No sessions in this period</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    There are no student sessions in this 14-day period. Reports will be available once sessions are completed in the period.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-semibold text-gray-900">Students with sessions in period</h2>
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-sm text-accent hover:underline"
                    >
                        {selectedIds.size === students.length ? 'Deselect all' : 'Select all'}
                    </button>
                </div>
                <ul className="divide-y divide-gray-100">
                    {students.map(s => (
                        <li key={s.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center hover:bg-gray-50/50">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(s.id)}
                                    onChange={() => toggleOne(s.id)}
                                    className="rounded border-gray-300 text-accent focus:ring-accent"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="font-medium text-gray-900">{s.full_name}</span>
                                        <span className="text-sm text-gray-500">({s.sessionCount} session{s.sessionCount !== 1 ? 's' : ''})</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                                        {s.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3.5 h-3.5" /> Student: {s.email}
                                            </span>
                                        )}
                                        {s.parent_email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3.5 h-3.5" /> Parent: {s.parent_email}
                                            </span>
                                        )}
                                        {!s.email && !s.parent_email && (
                                            <span className="text-amber-600">No email on file</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleViewAllReports(s)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    View all reports
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePreview({ id: s.id, name: s.full_name })}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-accent/30 text-xs font-medium text-accent hover:bg-accent/5"
                                >
                                    <Eye className="w-3.5 h-3.5" />
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
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium shadow-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {sending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating & sending…
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Generate & send to {selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''}
                        </>
                    )}
                </button>
                <p className="text-sm text-gray-500">
                    Each selected student will receive an AI-generated consolidated report by email; if a parent email is set, the parent will receive a separate version with a parent-friendly tone.
                </p>
            </div>

            {result && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Result</h2>
                    {result.periodLabel && (
                        <p className="text-sm text-gray-500 mb-4">Period: {result.periodLabel}</p>
                    )}
                    <ul className="space-y-3">
                        {result.results.map((r, i) => (
                            <li key={r.studentId || i} className="flex items-start gap-3 text-sm">
                                {r.error ? (
                                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <span className="font-medium text-gray-900">{r.studentName || 'Unknown'}</span>
                                    {r.error && <span className="text-red-600 ml-2">{r.error}</span>}
                                    {!r.error && (
                                        <span className="text-gray-500 ml-2">
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900">Fortnightly report preview</h3>
                                <p className="text-xs text-gray-500">Student: {previewStudent.name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closePreview}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Close
                            </button>
                        </div>
                        <div className="px-5 pt-3 flex gap-2 border-b border-gray-100">
                            <button
                                type="button"
                                onClick={() => setPreviewTab('student')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full ${previewTab === 'student'
                                    ? 'bg-accent text-white'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}
                            >
                                Student version
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('parent')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full ${previewTab === 'parent'
                                    ? 'bg-accent text-white'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}
                            >
                                Parent version
                            </button>
                        </div>
                        <div className="p-5 flex-1 overflow-auto min-w-0 flex flex-col">
                            {previewLoading && (
                                <div className="flex items-center justify-center flex-1 text-gray-500 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Generating preview…
                                </div>
                            )}
                            {!previewLoading && previewError && (
                                <div className="text-sm text-red-600">{previewError}</div>
                            )}
                            {!previewLoading && !previewError && (
                                <div className="flex-1 min-h-0 flex flex-col gap-3">
                                    <div className="text-sm text-gray-600 shrink-0">
                                        <span className="font-medium text-gray-700">Subject:</span>{' '}
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
