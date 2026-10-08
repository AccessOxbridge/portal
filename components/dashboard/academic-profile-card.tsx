'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, WarningCircle as AlertCircle, CaretRight as ChevronRight } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/lib'

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
            <div className="rounded-card bg-card p-5 shadow-border" role="status" aria-label="Loading your profile">
                <div className="flex items-center gap-3.5">
                    <Skeleton className="size-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3.5 w-44" />
                    </div>
                </div>
            </div>
        )
    }

    const isIncomplete = !profile || !profile.is_complete

    return (
        <Link
            href="/dashboard/student/profile"
            className={cn(
                'group block rounded-card border border-transparent p-5 outline-none transition-[box-shadow,background-color] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/40',
                isIncomplete
                    ? 'bg-tint-amber ring-1 ring-tint-amber-foreground/20 hover:ring-tint-amber-foreground/40'
                    : 'bg-card shadow-border hover:shadow-border-hover',
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                    <span className={cn(
                        'grid size-11 shrink-0 place-items-center rounded-full',
                        isIncomplete ? 'bg-card text-tint-amber-foreground' : 'bg-tint-blue text-tint-blue-foreground',
                    )}>
                        {isIncomplete ? (
                            <AlertCircle weight="duotone" className="size-6" />
                        ) : (
                            <GraduationCap weight="duotone" className="size-6" />
                        )}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">
                            {isIncomplete ? 'Complete your profile' : 'Academic profile'}
                        </p>
                        {isIncomplete && (
                            <p className="mt-0.5 truncate text-sm text-tint-amber-foreground">
                                Required for matching
                            </p>
                        )}
                    </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
            </div>

            {isIncomplete && (
                <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card">
                        <div
                            className="h-full rounded-full bg-warning transition-[width] duration-300 ease-snappy"
                            style={{ width: profile ? '30%' : '5%' }}
                        />
                    </div>
                    <span className="text-xs font-medium text-tint-amber-foreground">
                        {profile ? 'In progress' : 'Not started'}
                    </span>
                </div>
            )}
        </Link>
    )
}
