'use client'

import { useState } from 'react'
import MentorshipOnboarding from '@/components/dashboard/mentorship-onboarding'

interface StudentDashboardContentProps {
    profile: any
    activeSession: any
    pendingRequests: any[]
}

export default function StudentDashboardContent({
    profile,
    activeSession,
    pendingRequests
}: StudentDashboardContentProps) {
    const [showOnboarding, setShowOnboarding] = useState(false)

    return (
        <div className="space-y-10">
            <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-extrabold text-accent tracking-tight">
                        Student Dashboard
                    </h1>
                    <p className="mt-4 text-gray-500 text-xl font-medium">Welcome back, {profile.full_name}!</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeSession ? (
                    <div className="p-8 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50">
                        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Active Mentorship</h2>
                        <p className="text-gray-500 mb-6 leading-relaxed">You are currently paired with <strong>{activeSession.mentor_full_name}</strong>. Start your session now!</p>
                        {activeSession.zoom_join_url ? (
                            <a
                                href={activeSession.zoom_join_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-4 bg-accent text-white font-bold rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all text-center"
                            >
                                🎥 Join Zoom Session
                            </a>
                        ) : (
                            <div className="w-full py-4 bg-gray-100 text-gray-500 font-medium rounded-2xl text-center">
                                Zoom link will be available soon
                            </div>
                        )}
                    </div>
                ) : pendingRequests.length > 0 ? (
                    <div className="p-8 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50">
                        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
                            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Requests Pending</h2>
                        <p className="text-gray-500 mb-6 leading-relaxed">We've sent your request to the top 5 matching mentors. We'll notify you once one of them accepts!</p>
                        <div className="px-6 py-3 bg-amber-50 rounded-2xl text-amber-700 text-sm font-bold flex items-center gap-2">
                            24h Acceptance Window active
                        </div>
                    </div>
                ) : (
                    <div className="p-8 bg-accent rounded-[32px] shadow-2xl shadow-accent/30 flex flex-col justify-between group">
                        <div>
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4 italic">Unlock Personalized Mentorship</h2>
                            <p className="text-white/70 mb-8 text-sm leading-relaxed">Tell us about your goals and strengths, and we&apos;ll use AI to match you with the perfect mentor from our exclusive network.</p>
                        </div>
                        <button
                            onClick={() => setShowOnboarding(true)}
                            className="bg-rich-amber-accent text-accent font-bold py-4 px-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10"
                        >
                            Get Mentorship Now
                        </button>
                    </div>
                )}

                <div className="p-8 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-indigo-100 transition-all group lg:col-span-2">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Learning Resources</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['Oxbridge Strategy', 'Personal Statement Guide', 'Interview Mastery', 'Subject Deep Dives'].map((resource) => (
                            <div key={resource} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-accent/30 transition-colors flex items-center justify-between cursor-pointer group/item">
                                <span className="font-semibold text-gray-700">{resource}</span>
                                <svg className="w-5 h-5 text-gray-300 group-hover/item:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showOnboarding && (
                <MentorshipOnboarding onClose={() => setShowOnboarding(false)} />
            )}
        </div>
    )
}
