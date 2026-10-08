'use client'

import { useState } from 'react'
import { WarningCircle as AlertCircle, CheckCircle, Clock, ChatCentered as MessageSquare, User, Envelope as Mail, CircleNotch as Loader2 } from '@phosphor-icons/react/ssr'

export interface Issue {
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

export interface IssuesTableProps {
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
            open: 'bg-tint-rose text-tint-rose-foreground',
            in_progress: 'bg-tint-blue text-tint-blue-foreground',
            resolved: 'bg-tint-green text-tint-green-foreground',
            closed: 'bg-muted text-foreground',
        }
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.open}`}>
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
            </span>
        )
    }

    const getPriorityBadge = (priority: string) => {
        const styles: Record<string, string> = {
            low: 'bg-muted text-muted-foreground',
            normal: 'bg-tint-blue text-brand',
            high: 'bg-tint-amber text-tint-amber-foreground',
            urgent: 'bg-tint-rose text-destructive',
        }
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority] || styles.normal}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
        )
    }

    const getIssueTypeBadge = (type: string) => {
        const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
            payment: { bg: 'bg-tint-green text-tint-green-foreground', icon: '💳' },
            session: { bg: 'bg-tint-violet text-tint-violet-foreground', icon: '📅' },
            technical: { bg: 'bg-tint-amber text-tint-amber-foreground', icon: '⚙️' },
            student_help: { bg: 'bg-tint-blue text-tint-blue-foreground', icon: '🆘' },
            other: { bg: 'bg-muted/60 text-foreground', icon: '📝' },
        }
        const style = styles[type] || styles.other
        return (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg}`}>
                {style.icon} {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
                        className={`px-4 py-2 rounded-control text-sm font-medium transition-[background-color,box-shadow,color] duration-150 ${filter === f
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted'
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
                        <div className="p-12 bg-muted/60 rounded-card text-center">
                            <AlertCircle className="size-12 text-muted-foreground/60 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground">No issues found</h3>
                            <p className="text-muted-foreground">Try changing the filter or check back later.</p>
                        </div>
                    ) : (
                        filteredIssues.map((issue) => (
                            <div
                                key={issue.id}
                                onClick={() => {
                                    setSelectedIssue(issue)
                                    setAdminNotes(issue.admin_notes || '')
                                }}
                                className={`p-5 bg-card rounded-[20px] border-2 transition-[background-color,box-shadow,color] duration-150 cursor-pointer hover:shadow-border ${selectedIssue?.id === issue.id
                                    ? 'border-primary shadow-border'
                                    : 'border-border hover:border-border'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            {getIssueTypeBadge(issue.issue_type)}
                                            {getStatusBadge(issue.status)}
                                            {getPriorityBadge(issue.priority)}
                                        </div>
                                        <h3 className="font-semibold text-foreground truncate">
                                            {issue.subject}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {issue.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <User className="size-4" />
                                        <span>{issue.reporter_name}</span>
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                            {issue.reporter_type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Clock className="size-4" />
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
                        <div className="border border-transparent bg-card rounded-card shadow-border sticky top-6">
                            <div className="p-6 border-b border-border">
                                <div className="flex items-center gap-2 mb-3">
                                    {getIssueTypeBadge(selectedIssue.issue_type)}
                                    {getStatusBadge(selectedIssue.status)}
                                </div>
                                <h2 className="text-xl font-semibold text-foreground">
                                    {selectedIssue.subject}
                                </h2>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Reporter Info */}
                                <div className="p-4 bg-muted/60 rounded-control space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground">
                                        Reporter
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <User className="size-4 text-muted-foreground" />
                                        <span className="font-medium text-foreground">{selectedIssue.reporter_name}</span>
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                            {selectedIssue.reporter_type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="size-4" />
                                        <a href={`mailto:${selectedIssue.reporter_email}`} className="hover:text-primary">
                                            {selectedIssue.reporter_email}
                                        </a>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono">
                                        ID: {selectedIssue.reporter_id}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                                        Description
                                    </h4>
                                    <p className="text-foreground text-sm whitespace-pre-wrap">
                                        {selectedIssue.description}
                                    </p>
                                </div>

                                {/* Admin Notes */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                                        Admin notes
                                    </h4>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Add notes about this issue..."
                                        rows={3}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm py-2.5 px-3.5 leading-relaxed resize-none"
                                    />
                                </div>

                                {/* Status Actions */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground">
                                        Update status
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedIssue.status !== 'in_progress' && (
                                            <button
                                                onClick={() => updateIssueStatus(selectedIssue.id, 'in_progress')}
                                                disabled={updatingId === selectedIssue.id}
                                                className="flex items-center justify-center gap-2 px-3 py-2 bg-tint-blue text-brand rounded-control text-sm font-medium hover:bg-tint-blue transition-colors disabled:opacity-50"
                                            >
                                                {updatingId === selectedIssue.id ? (
                                                    <Loader2 className="size-4 animate-spin" />
                                                ) : (
                                                    <Clock className="size-4" />
                                                )}
                                                In Progress
                                            </button>
                                        )}
                                        {selectedIssue.status !== 'resolved' && (
                                            <button
                                                onClick={() => updateIssueStatus(selectedIssue.id, 'resolved')}
                                                disabled={updatingId === selectedIssue.id}
                                                className="flex items-center justify-center gap-2 px-3 py-2 bg-tint-green text-success rounded-control text-sm font-medium hover:bg-tint-green transition-colors disabled:opacity-50"
                                            >
                                                {updatingId === selectedIssue.id ? (
                                                    <Loader2 className="size-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="size-4" />
                                                )}
                                                Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Timestamps */}
                                <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
                                    <p>Created: {selectedIssue.created_at ? new Date(selectedIssue.created_at).toLocaleString('en-GB') : 'N/A'}</p>
                                    <p>Updated: {selectedIssue.updated_at ? new Date(selectedIssue.updated_at).toLocaleString('en-GB') : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 bg-muted/60 rounded-card text-center">
                            <MessageSquare className="size-12 text-muted-foreground/60 mx-auto mb-4" />
                            <h3 className="font-medium text-muted-foreground">Select an issue</h3>
                            <p className="text-sm text-muted-foreground mt-1">Click on an issue to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
