'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, AlertCircle, ChevronRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface StudentProfile {
    school_name: string | null
    year_group: string | null
    target_university: string | null
    target_course: string | null
    is_complete: boolean | null
}

interface AcademicProfileCardProps {
    userId: string
    userName: string
}

export default function AcademicProfileCard({ userId, userName }: AcademicProfileCardProps) {
    const [profile, setProfile] = useState<StudentProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from('student_profiles')
                .select('school_name, year_group, target_university, target_course, is_complete')
                .eq('id', userId)
                .single()

            setProfile(data)
            setLoading(false)
        }
        fetchProfile()
    }, [userId, supabase])

    if (loading) {
        return (
            <div className="p-4 bg-gray-50 rounded-2xl animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                    <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                        <div className="h-3 bg-gray-200 rounded w-32" />
                    </div>
                </div>
            </div>
        )
    }

    const isIncomplete = !profile || !profile.is_complete

    return (
        <Link
            href="/dashboard/student/profile"
            className={`block p-6 bg-white rounded-[32px] border shadow-xl shadow-gray-200/50 transition-all group hover:shadow-indigo-100 ${isIncomplete
                ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                : 'border-gray-100 hover:border-accent/30'
                }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isIncomplete ? 'bg-amber-100' : 'bg-accent/10'
                        }`}>
                        {isIncomplete ? (
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        ) : (
                            <GraduationCap className="w-6 h-6 text-accent" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className={`text-base font-bold truncate ${isIncomplete ? 'text-amber-700' : 'text-gray-900'}`}>
                            {isIncomplete ? 'Complete Your Profile' : 'Academic Profile'}
                        </p>
                        {isIncomplete && (
                            <p className="text-sm truncate mt-0.5 text-amber-600/80">
                                Required for matching
                            </p>
                        )}
                    </div>
                </div>
                <ChevronRight className={`w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1 ${isIncomplete ? 'text-amber-500' : 'text-gray-400'
                    }`} />
            </div>

            {isIncomplete && (
                <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: profile ? '30%' : '5%' }}
                        />
                    </div>
                    <span className="text-xs text-amber-600 font-semibold">
                        {profile ? 'In Progress' : 'Not Started'}
                    </span>
                </div>
            )}
        </Link>
    )
}
