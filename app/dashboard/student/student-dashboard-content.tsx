'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, Video, ArrowRight } from 'lucide-react'
import AcademicProfileCard from '@/components/dashboard/academic-profile-card'
import WeeklyCalendar from '@/components/dashboard/weekly-calendar'
import ApplicationTimeline from '@/components/dashboard/application-timeline'
import BookSessionModal from '@/components/dashboard/book-session-modal'

interface UpcomingSession {
    id: string
    scheduled_at: string
    zoom_join_url: string | null
    mentor_full_name: string
}

interface AcademicProfile {
    target_university: string | null
    target_course: string | null
    application_year: number | null
    subjects: { name: string; predicted_grade: string }[] | null
    school_name: string | null
    school_country: string | null
    curriculum: string | null
    curriculum_other: string | null
    timezone: string | null
    interests: string | null
    extracurriculars: string | null
    additional_notes: string | null
    is_complete: boolean | null
}

interface StudentDashboardContentProps {
    profile: any
    activeSession: any
    pendingRequests: any[]
    upcomingSessions: UpcomingSession[]
    academicProfile: AcademicProfile | null
    userId: string
    userName: string
}

export default function StudentDashboardContent({
    profile,
    activeSession,
    pendingRequests,
    upcomingSessions,
    academicProfile,
    userId,
    userName
}: StudentDashboardContentProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        })
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const isSessionSoon = (dateString: string) => {
        const sessionTime = new Date(dateString).getTime()
        const now = Date.now()
        const oneHour = 60 * 60 * 1000
        return sessionTime - now <= oneHour && sessionTime > now
    }

    const [showBookingModal, setShowBookingModal] = useState(false)

    // Check if profile is complete enough for booking
    const canBook = academicProfile?.is_complete &&
        academicProfile?.school_name &&
        academicProfile?.timezone &&
        academicProfile?.subjects &&
        academicProfile.subjects.length > 0

    return (
        <>
            <div className="space-y-10">
                <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-5xl font-extrabold text-accent tracking-tight">
                            Student Dashboard
                        </h1>
                        <p className="mt-4 text-gray-500 text-xl font-medium">Welcome back, {profile.full_name}!</p>

                        {/* Academic Profile + Targets on left */}
                        <div className="my-4">
                            <div className="space-y-4">
                                <AcademicProfileCard userId={userId} userName={userName} />

                                {/* Targets Section */}
                                {academicProfile && (academicProfile.target_university || academicProfile.target_course) && (
                                    <div className="flex flex-wrap items-center gap-3">
                                        {academicProfile.target_university && (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-semibold">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                {academicProfile.target_university}
                                            </span>
                                        )}
                                        {academicProfile.target_course && (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                                {academicProfile.target_course}
                                            </span>
                                        )}
                                        {academicProfile.application_year && (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                                                <Calendar className="w-4 h-4" />
                                                {academicProfile.application_year} Entry
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Booking / Requests Card as header sibling (right) */}
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-6 w-full md:w-[360px]">
                        {activeSession ? (
                            <div className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-lg shadow-gray-200/50">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-gray-900 truncate">Active Mentorship</h3>
                                        <p className="text-sm text-gray-500 mt-0.5 truncate">Mentor: <strong>{activeSession.mentor_full_name}</strong></p>
                                    </div>
                                </div>
                                {activeSession.scheduled_at && (
                                    <p className="text-accent font-bold text-sm mt-4">
                                        {new Date(activeSession.scheduled_at).toLocaleDateString('en-GB', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short'
                                        })} · {new Date(activeSession.scheduled_at).toLocaleTimeString('en-GB', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                )}
                            </div>
                        ) : pendingRequests.length > 0 ? (
                            <div className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-lg shadow-gray-200/50">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-gray-900 truncate">Requests Pending</h3>
                                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">We've sent your request to the top 5 matching mentors. We'll notify you once one of them accepts!</p>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <Link
                                        href="/dashboard/student/sessions"
                                        className="block w-full py-3 bg-accent text-white font-bold text-[18px] rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all text-center mb-3"
                                    >
                                        View Pending Requests
                                    </Link>
                                    {canBook ? (
                                        <button
                                            onClick={() => setShowBookingModal(true)}
                                            className="block w-full py-3 text-accent font-semibold text-[16px] text-center border-2 border-accent/20 rounded-2xl hover:bg-accent/5 transition-colors"
                                        >
                                            + Book Another Session
                                        </button>
                                    ) : (
                                        <Link
                                            href="/dashboard/student/profile"
                                            className="block w-full py-3 text-amber-600 font-semibold text-[16px] text-center border-2 border-amber-200 rounded-2xl hover:bg-amber-50 transition-colors"
                                        >
                                            Complete Profile to Book
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-accent rounded-[32px] shadow-2xl shadow-accent/30 flex flex-col justify-between group">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white italic truncate">Unlock Personalized Mentorship</h3>
                                        <p className="text-sm text-white/75 mt-2 leading-relaxed">{
                                            canBook
                                                ? "Select your available time slots and we'll match you with the perfect mentor."
                                                : 'Complete your academic profile first, then book a session with a curated mentor.'
                                        }</p>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    {canBook ? (
                                        <button
                                            onClick={() => setShowBookingModal(true)}
                                            className="bg-rich-amber-accent text-accent font-bold py-3 px-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10 text-center w-full"
                                        >
                                            Book a Session
                                        </button>
                                    ) : (
                                        <Link
                                            href="/dashboard/student/profile"
                                            className="bg-rich-amber-accent text-accent font-bold py-3 px-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10 text-center w-full"
                                        >
                                            Complete Profile
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Application Timeline */}
                <ApplicationTimeline applicationYear={academicProfile?.application_year} />

                {/* Weekly Calendar */}
                <div className="mb-10">
                    <WeeklyCalendar
                        sessions={upcomingSessions.map(s => ({
                            id: s.id,
                            scheduled_at: s.scheduled_at,
                            zoom_url: s.zoom_join_url,
                            person_name: s.mentor_full_name
                        }))}
                        personLabel="Mentor"
                        credits={profile?.credits || 0}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className={`p-8 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-indigo-100 transition-all group ${upcomingSessions.length === 0 ? 'lg:col-span-2' : ''}`}>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Learning Resources</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: 'Oxbridge Strategy', slug: 'oxbridge-admissions' },
                                { label: 'Personal Statement Guide', slug: 'personal-statement' },
                                { label: 'Interview Mastery', slug: 'interview-tips' },
                                { label: 'Subject Deep Dives', slug: 'uk-universities' },
                            ].map(({ label, slug }) => (
                                <Link key={slug} href={`/dashboard/student/resources?category=${slug}`} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-accent/30 transition-colors flex items-center justify-between group/item">
                                    <span className="font-semibold text-gray-700">{label}</span>
                                    <svg className="w-5 h-5 text-gray-300 group-hover/item:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {
                academicProfile && canBook && (
                    <BookSessionModal
                        isOpen={showBookingModal}
                        onClose={() => setShowBookingModal(false)}
                        studentProfile={{
                            school_name: academicProfile.school_name || '',
                            school_country: academicProfile.school_country || '',
                            curriculum: academicProfile.curriculum || '',
                            curriculum_other: academicProfile.curriculum_other || undefined,
                            subjects: academicProfile.subjects || [],
                            target_university: academicProfile.target_university || '',
                            timezone: academicProfile.timezone || '',
                            interests: academicProfile.interests || '',
                            extracurriculars: academicProfile.extracurriculars || '',
                            additional_notes: academicProfile.additional_notes || undefined
                        }}
                    />
                )
            }
        </>
    )
}
