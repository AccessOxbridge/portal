'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, CalendarBlank as Calendar, CheckCircle as CheckCircle2, WarningCircle as AlertCircle } from '@phosphor-icons/react/ssr'
import { Avatar } from '@/components/ui/avatar'
import { segmentClass, segmentCount, segmentTrack } from '@/components/ui/segmented'
import { cn } from '@/utils/lib'

interface SessionReport {
    id: string
    scheduled_at: string
    status: string
    zoom_meeting_status: string | null
    student_full_name: string
    student_photo_url?: string | null
    has_report: boolean
    submitted_at: string | null
}

interface MentorReportsContentProps {
    toComplete: SessionReport[]
    completed: SessionReport[]
}

export default function MentorReportsContent({ toComplete, completed }: MentorReportsContentProps) {
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')

    return (
        <div>
            {/* Tab Navigation */}
            <div className={cn(segmentTrack, 'mb-6')}>
                <button
                    onClick={() => setActiveTab('pending')}
                    aria-pressed={activeTab === 'pending'}
                    className={segmentClass(activeTab === 'pending')}
                >
                    To complete
                    {toComplete.length > 0 && (
                        <span className={cn(segmentCount, 'bg-tint-amber text-tint-amber-foreground')}>
                            {toComplete.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    aria-pressed={activeTab === 'completed'}
                    className={segmentClass(activeTab === 'completed')}
                >
                    Completed
                    {completed.length > 0 && (
                        <span className={cn(segmentCount, 'bg-card text-muted-foreground')}>
                            {completed.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            {activeTab === 'pending' && (
                <div className="space-y-4">
                    {toComplete.length === 0 ? (
                        <div className="bg-card rounded-card border border-border p-12 text-center">
                            <div className="size-16 bg-tint-green rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="size-8 text-success" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">All caught up</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                You have no pending reports. Reports will appear here after your sessions end.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-tint-amber border border-border rounded-control p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="size-5 text-warning mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-tint-amber-foreground">
                                            You have {toComplete.length} report{toComplete.length > 1 ? 's' : ''} to complete
                                        </p>
                                        <p className="text-sm text-warning mt-0.5">
                                            Please submit reports promptly so students can receive their personalised feedback.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {toComplete.map((session) => (
                                <SessionReportCard key={session.id} session={session} isPending />
                            ))}
                        </>
                    )}
                </div>
            )}

            {activeTab === 'completed' && (
                <div className="space-y-4">
                    {completed.length === 0 ? (
                        <div className="bg-card rounded-card border border-border p-12 text-center">
                            <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="size-8 text-muted-foreground/60" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No completed reports</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Your completed reports will appear here.
                            </p>
                        </div>
                    ) : (
                        completed.map((session) => (
                            <SessionReportCard key={session.id} session={session} isPending={false} />
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

function SessionReportCard({ session, isPending }: { session: SessionReport; isPending: boolean }) {
    const sessionDate = new Date(session.scheduled_at)

    return (
        <div className="bg-card rounded-card border border-border p-5 hover:shadow-border transition-[background-color,box-shadow,color] duration-150">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Student Avatar */}
                    <Avatar name={session.student_full_name || 'Student'} src={session.student_photo_url} size="lg" />

                    <div>
                        <h3 className="font-semibold text-foreground">
                            Session with {session.student_full_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="size-4" />
                            <span>
                                {sessionDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isPending ? (
                        <Link
                            href={`/dashboard/mentor/sessions/${session.id}/report`}
                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm"
                        >
                            Submit report
                        </Link>
                    ) : (
                        <div className="flex items-center gap-2 text-success">
                            <CheckCircle2 className="size-5" />
                            <span className="text-sm font-medium">Submitted</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Submitted timestamp for completed reports */}
            {!isPending && session.submitted_at && (
                <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    Submitted on {new Date(session.submitted_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
            )}
        </div>
    )
}
