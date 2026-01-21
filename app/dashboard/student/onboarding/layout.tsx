import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function StudentOnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || ((profile as any).role !== 'student' && (profile as any).role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    return (
        <div className="max-w-3xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Student Onboarding
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Please fill in the form with as much detail as possible so our strategists can curate the best roadmap for you.
                    Using this information, we’ll allocate you to mentors who will guide you to success.
                </p>
                <div className="mt-5">
                    <Link href="/dashboard/student" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
                        ← Back to dashboard
                    </Link>
                </div>
            </header>

            {children}
        </div>
    )
}

