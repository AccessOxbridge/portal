import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreatorsManager from './creators-manager'

export default async function CreatorsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    // Role check
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch creators
    const { data: creators } = await supabase
        .from('creators')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <header className="flex items-center gap-4">
                <Link
                    href="/dashboard/admin"
                    className="p-2 bg-card border border-border rounded-control hover:bg-muted/60 transition-colors"
                >
                    <svg className="size-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-3xl font-semibold text-foreground tracking-tight">Creator management</h1>
                    <p className="text-muted-foreground mt-1">Manage content creator partnerships</p>
                </div>
            </header>

            <CreatorsManager initialCreators={creators || []} />
        </div>
    )
}
