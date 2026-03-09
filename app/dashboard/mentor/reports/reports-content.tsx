'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Calendar, User, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface SessionReport {
    id: string
    scheduled_at: string
    status: string
    zoom_meeting_status: string | null
    student_full_name: string
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
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                        }`}
                >
                    <Clock className="w-4 h-4" />
                    To Complete
                    {toComplete.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                            {toComplete.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                        }`}
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                    <span className="ml-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                        {completed.length}
                    </span>
                </button>
            </div>

            {/* Content */}
            {activeTab === 'pending' && (
                <div className="space-y-4">
                    {toComplete.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">All Caught Up!</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">
                                You have no pending reports. Reports will appear here after your sessions end.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">
                                            You have {toComplete.length} report{toComplete.length > 1 ? 's' : ''} to complete
                                        </p>
                                        <p className="text-sm text-amber-600 mt-0.5">
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
                        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Completed Reports</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">
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
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Student Avatar */}
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-accent" />
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900">
                            Session with {session.student_full_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
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
                            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors"
                        >
                            Submit Report
                        </Link>
                    ) : (
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Submitted</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Submitted timestamp for completed reports */}
            {!isPending && session.submitted_at && (
                <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
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
