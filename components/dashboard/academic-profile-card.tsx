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
            <div className="mx-3 mb-4 p-4 bg-gray-50 rounded-2xl animate-pulse">
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
            className={`mx-3 mb-4 block p-4 rounded-2xl transition-all group hover:shadow-md ${isIncomplete
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-300'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-200'
                }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isIncomplete ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                        {isIncomplete ? (
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        ) : (
                            <GraduationCap className="w-5 h-5 text-blue-600" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                            {isIncomplete ? 'Complete Your Profile' : 'My Academic Profile'}
                        </p>
                        <p className={`text-xs truncate ${isIncomplete ? 'text-amber-700' : 'text-gray-500'}`}>
                            {isIncomplete
                                ? 'Required for mentor matching'
                                : profile?.target_university
                                    ? `Target: ${profile.target_university}`
                                    : userName
                            }
                        </p>
                    </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${isIncomplete ? 'text-amber-500' : 'text-gray-400'
                    }`} />
            </div>

            {isIncomplete && (
                <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: profile ? '30%' : '0%' }}
                        />
                    </div>
                    <span className="text-[10px] text-amber-600 font-medium">
                        {profile ? 'In Progress' : 'Not Started'}
                    </span>
                </div>
            )}
        </Link>
    )
}
