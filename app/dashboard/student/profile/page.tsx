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
            <header className="mb-6">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                    My academic profile
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Help us match you with the perfect mentor by completing your profile
                </p>
            </header>

            {/* Photo sits above the questionnaire and saves on its own — it is
                identity, not academic history, and shouldn't wait on this form
                being complete. */}
            <section className="mb-6 overflow-hidden rounded-card bg-card shadow-border">
                <div className="border-b border-border px-5 py-4 sm:px-6">
                    <h2 className="text-base font-semibold text-foreground">Profile photo</h2>
                    <p className="text-sm text-muted-foreground">
                        Shown to your mentors in messages and sessions
                    </p>
                </div>
                <div className="p-5 sm:p-6">
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
