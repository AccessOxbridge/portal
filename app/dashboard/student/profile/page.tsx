import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AcademicProfileContent from './academic-profile-content'
import AvatarUploader from '@/components/profile/avatar-uploader'

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
        .select('role, full_name, photo_url')
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

            {/* Photo sits above the questionnaire and saves on its own — it is
                identity, not academic history, and shouldn't wait on this form
                being complete. */}
            <section className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Profile photo</h2>
                    <p className="text-sm text-gray-500">
                        Shown to your mentors in messages and sessions
                    </p>
                </div>
                <div className="p-6">
                    <AvatarUploader
                        userId={user.id}
                        photoUrl={profile.photo_url ?? null}
                        name={profile.full_name || 'Student'}
                    />
                </div>
            </section>

            <AcademicProfileContent
                userId={user.id}
                userName={profile.full_name || 'Student'}
                existingProfile={academicProfile as any}
            />
        </div>
    )
}
