import { redirect } from 'next/navigation'
import { Envelope, LockKey } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/server'
import { isAccountDisabled } from '@/lib/account-access'
import { Button } from '@/components/ui/button'

export default async function AccountDisabledPage() {
    const db = await createClient()
    const {
        data: { user },
    } = await db.auth.getUser()
    if (!user) redirect('/login')
    if (!(await isAccountDisabled(db, user.id))) redirect('/dashboard')

    return (
        <main className="grid min-h-dvh place-items-center bg-background px-5 py-12">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-primary text-gold">
                    <LockKey className="size-7" aria-hidden />
                </div>
                <p className="mb-3 text-sm font-semibold text-gold-foreground">
                    Access Oxbridge
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-balance">
                    Your account has been disabled.
                </h1>
                <p className="mt-4 text-muted-foreground">
                    Please contact the administrator.
                </p>
                <Button asChild className="mt-7">
                    <a href="mailto:office@accessoxbridge.io">
                        <Envelope aria-hidden className="size-5" />
                        Email us
                    </a>
                </Button>
                <form action="/auth/signout" method="post" className="mt-4">
                    <Button variant="ghost" type="submit">
                        Sign out
                    </Button>
                </form>
            </div>
        </main>
    )
}
