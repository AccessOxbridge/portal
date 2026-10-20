import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ApprovalButtons } from './approval-buttons'

function formatResponseKey(key: string) {
    return key.replace(/_/g, ' ')
}

function isProbablyUrl(value: unknown): value is string {
    return typeof value === 'string' && /^https?:\/\//i.test(value)
}

export default async function AdminApprovalsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) return redirect('/dashboard')

    const { data: mentors } = await supabase
        .from('mentors')
        .select(`
            *,
            profiles:profiles!mentors_id_fkey (
                full_name,
                id
            )
        `)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-10">
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Application approvals</h1>
                    <p className="mt-2 sm:mt-3 text-muted-foreground text-base sm:text-lg font-medium">Review and manage mentor onboarding applications.</p>
                </div>
                <div className="flex space-x-2">
                    <span className="bg-rich-beige-accent text-primary px-4 py-2 rounded-card text-sm font-semibold shadow-inner">
                        {mentors?.length || 0} Pending
                    </span>
                </div>
            </header>

            {!mentors || mentors.length === 0 ? (
                <div className="rounded-card border-2 border-dashed border-border bg-card px-6 py-16 text-center">
                    <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-tint-green text-tint-green-foreground">
                        <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <h2 className="text-base font-semibold text-foreground">All caught up</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">No pending applications to review right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {mentors.map((app: any) => (
                        (() => {
                            const avatarUrl: string | null =
                                app.photo_url ||
                                app.responses?.photo_url ||
                                app.responses?.photo ||
                                null

                            const resumeUrl: string | null =
                                app.cv_url ||
                                app.responses?.cv_url ||
                                app.responses?.cv ||
                                null

                            const responseEntries = Object.entries(app.responses ?? {}).filter(([key]) => {
                                // Avoid showing raw asset URLs in the responses grid
                                return !['cv', 'photo', 'cv_url', 'photo_url'].includes(key)
                            })

                            return (
                                <div key={app.id} className="bg-card shadow-border rounded-[40px] border border-border overflow-hidden transition-[background-color,box-shadow,color] duration-150 group">
                                    <div className="p-6 sm:p-8 lg:p-10">
                                        <div className="flex flex-col gap-5 sm:flex-row sm:justify-between sm:items-start mb-8">
                                            <div className="flex items-center gap-4">
                                                {avatarUrl ? (
                                                    <img
                                                        src={avatarUrl}
                                                        alt={app.profiles?.full_name || 'Mentor'}
                                                        className="size-16 rounded-card object-cover shadow-border group-hover:scale-110 transition-transform"
                                                    />
                                                ) : (
                                                    <div className="size-16 bg-primary rounded-card flex items-center justify-center text-white font-semibold text-2xl shadow-border group-hover:scale-110 transition-transform">
                                                        {app.profiles?.full_name?.[0] || '?'}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-2xl font-semibold text-foreground">{app.profiles?.full_name || 'Unknown User'}</h3>
                                                    <p className="text-muted-foreground font-medium">{new Date(app.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 justify-start sm:justify-end">
                                                {resumeUrl ? (
                                                    <a
                                                        href={resumeUrl}
                                                        target="_blank"
                                                        rel="noreferrer noopener"
                                                        className="text-sm font-semibold text-brand hover:text-tint-blue-foreground hover:underline break-all"
                                                    >
                                                        Mentor&apos;s resume
                                                    </a>
                                                ) : null}
                                                <ApprovalButtons applicationId={app.id} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/60 rounded-card p-6 sm:p-8 border border-border shadow-inner">
                                            {responseEntries.map(([key, value]: [string, any]) => (
                                                <div key={key}>
                                                    <span className="block text-[10px] font-semibold text-primary mb-2 opacity-60">
                                                        {formatResponseKey(key)}
                                                    </span>
                                                    <div className="text-foreground font-semibold leading-relaxed wrap-break-word">
                                                        {Array.isArray(value) ? (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {value.map((v: any, idx: number) => (
                                                                    <span
                                                                        key={`${String(v)}-${idx}`}
                                                                        className="bg-card border border-border px-4 py-1.5 rounded-control text-xs font-semibold text-foreground shadow-border"
                                                                    >
                                                                        {String(v)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : isProbablyUrl(value) ? (
                                                            <a
                                                                href={value}
                                                                target="_blank"
                                                                rel="noreferrer noopener"
                                                                className="text-brand hover:text-tint-blue-foreground hover:underline break-all"
                                                            >
                                                                {value}
                                                            </a>
                                                        ) : (
                                                            <span className="whitespace-pre-wrap">{String(value)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()
                    ))}
                </div>
            )}
        </div>
    )
}
