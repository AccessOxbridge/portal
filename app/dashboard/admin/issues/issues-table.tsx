'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, Clock, MessageSquare, User, Mail, Loader2 } from 'lucide-react'

interface Issue {
    id: string
    reporter_id: string
    reporter_name: string
    reporter_email: string
    reporter_type: string
    issue_type: string
    subject: string
    description: string
    status: string
    priority: string
    admin_notes: string | null
    created_at: string | null
    updated_at: string | null
}

interface IssuesTableProps {
    issues: Issue[]
}

export default function IssuesTable({ issues: initialIssues }: IssuesTableProps) {
    const [issues, setIssues] = useState(initialIssues)
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
    const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all')
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [adminNotes, setAdminNotes] = useState('')

    const filteredIssues = issues.filter(issue => {
        if (filter === 'all') return true
        if (filter === 'resolved') return issue.status === 'resolved' || issue.status === 'closed'
        return issue.status === filter
    })

    const updateIssueStatus = async (issueId: string, newStatus: string) => {
        setUpdatingId(issueId)
        try {
            const response = await fetch('/api/user-issues', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    issue_id: issueId,
                    status: newStatus,
                    admin_notes: adminNotes || undefined,
                }),
            })

            if (response.ok) {
                setIssues(prev => prev.map(i =>
                    i.id === issueId ? { ...i, status: newStatus, admin_notes: adminNotes || i.admin_notes } : i
                ))
                if (selectedIssue?.id === issueId) {
                    setSelectedIssue(prev => prev ? { ...prev, status: newStatus, admin_notes: adminNotes || prev.admin_notes } : null)
                }
            }
        } catch (error) {
            console.error('Failed to update issue:', error)
        } finally {
            setUpdatingId(null)
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            open: 'bg-red-100 text-red-700',
            in_progress: 'bg-blue-100 text-blue-700',
            resolved: 'bg-green-100 text-green-700',
            closed: 'bg-gray-100 text-gray-700',
        }
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.open}`}>
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
            </span>
        )
    }

    const getPriorityBadge = (priority: string) => {
        const styles: Record<string, string> = {
            low: 'bg-gray-100 text-gray-600',
            normal: 'bg-blue-50 text-blue-600',
            high: 'bg-orange-100 text-orange-600',
            urgent: 'bg-red-100 text-red-600',
        }
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority] || styles.normal}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
        )
    }

    const getIssueTypeBadge = (type: string) => {
        const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
            payment: { bg: 'bg-green-50 text-green-700', icon: '💳' },
            session: { bg: 'bg-purple-50 text-purple-700', icon: '📅' },
            technical: { bg: 'bg-orange-50 text-orange-700', icon: '⚙️' },
            other: { bg: 'bg-gray-50 text-gray-700', icon: '📝' },
        }
        const style = styles[type] || styles.other
        return (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg}`}>
                {style.icon} {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex gap-2">
                {(['all', 'open', 'in_progress', 'resolved'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f
                                ? 'bg-accent text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'all' ? 'All' : f.replace('_', ' ').charAt(0).toUpperCase() + f.replace('_', ' ').slice(1)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Issues List */}
                <div className="lg:col-span-2 space-y-4">
                    {filteredIssues.length === 0 ? (
                        <div className="p-12 bg-gray-50 rounded-[24px] text-center">
                            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600">No issues found</h3>
                            <p className="text-gray-400">Try changing the filter or check back later.</p>
                        </div>
                    ) : (
                        filteredIssues.map((issue) => (
                            <div
                                key={issue.id}
                                onClick={() => {
                                    setSelectedIssue(issue)
                                    setAdminNotes(issue.admin_notes || '')
                                }}
                                className={`p-5 bg-white rounded-[20px] border-2 transition-all cursor-pointer hover:shadow-md ${selectedIssue?.id === issue.id
                                        ? 'border-accent shadow-lg'
                                        : 'border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            {getIssueTypeBadge(issue.issue_type)}
                                            {getStatusBadge(issue.status)}
                                            {getPriorityBadge(issue.priority)}
                                        </div>
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {issue.subject}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                            {issue.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <User className="w-4 h-4" />
                                        <span>{issue.reporter_name}</span>
                                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                            {issue.reporter_type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-gray-400">
                                        <Clock className="w-4 h-4" />
                                        {issue.created_at ? new Date(issue.created_at).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        }) : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Issue Details Panel */}
                <div className="lg:col-span-1">
                    {selectedIssue ? (
                        <div className="bg-white rounded-[24px] border border-gray-100 shadow-lg sticky top-6">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                    {getIssueTypeBadge(selectedIssue.issue_type)}
                                    {getStatusBadge(selectedIssue.status)}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {selectedIssue.subject}
                                </h2>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Reporter Info */}
                                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Reporter
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-900">{selectedIssue.reporter_name}</span>
                                        <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">
                                            {selectedIssue.reporter_type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Mail className="w-4 h-4" />
                                        <a href={`mailto:${selectedIssue.reporter_email}`} className="hover:text-accent">
                                            {selectedIssue.reporter_email}
                                        </a>
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono">
                                        ID: {selectedIssue.reporter_id}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Description
                                    </h4>
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                        {selectedIssue.description}
                                    </p>
                                </div>

                                {/* Admin Notes */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Admin Notes
                                    </h4>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Add notes about this issue..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                                    />
                                </div>

                                {/* Status Actions */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Update Status
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedIssue.status !== 'in_progress' && (
                                            <button
                                                onClick={() => updateIssueStatus(selectedIssue.id, 'in_progress')}
                                                disabled={updatingId === selectedIssue.id}
                                                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                                            >
                                                {updatingId === selectedIssue.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Clock className="w-4 h-4" />
                                                )}
                                                In Progress
                                            </button>
                                        )}
                                        {selectedIssue.status !== 'resolved' && (
                                            <button
                                                onClick={() => updateIssueStatus(selectedIssue.id, 'resolved')}
                                                disabled={updatingId === selectedIssue.id}
                                                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                                            >
                                                {updatingId === selectedIssue.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4" />
                                                )}
                                                Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Timestamps */}
                                <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
                                    <p>Created: {selectedIssue.created_at ? new Date(selectedIssue.created_at).toLocaleString('en-GB') : 'N/A'}</p>
                                    <p>Updated: {selectedIssue.updated_at ? new Date(selectedIssue.updated_at).toLocaleString('en-GB') : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 bg-gray-50 rounded-[24px] text-center">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="font-medium text-gray-500">Select an issue</h3>
                            <p className="text-sm text-gray-400 mt-1">Click on an issue to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
