import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AcademicProfileContent from './academic-profile-content'

export default async function AcademicProfilePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch student academic profile
    const { data: academicProfile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="max-w-3xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">
                    My Academic Profile
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Help us match you with the perfect mentor by completing your profile
                </p>
            </header>

            <AcademicProfileContent
                userId={user.id}
                userName={profile.full_name || 'Student'}
                existingProfile={academicProfile as any}
            />
        </div>
    )
}
