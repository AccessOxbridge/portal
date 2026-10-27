'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { isAccountDisabled } from '@/lib/account-access'

/** Also move an already-open dashboard to the disabled screen. */
export function AccountAccessGate({ userId }: { userId: string }) {
    const router = useRouter()
    useEffect(() => {
        const db = createClient()
        let active = true
        let checking = false
        async function check() {
            if (checking || document.visibilityState === 'hidden') return
            checking = true
            try {
                if ((await isAccountDisabled(db, userId)) && active)
                    router.replace('/account-disabled')
            } catch {
                // Server and RLS checks still fail closed; retry on focus/timer.
            } finally {
                checking = false
            }
        }
        const interval = window.setInterval(check, 30_000)
        window.addEventListener('focus', check)
        document.addEventListener('visibilitychange', check)
        return () => {
            active = false
            window.clearInterval(interval)
            window.removeEventListener('focus', check)
            document.removeEventListener('visibilitychange', check)
        }
    }, [router, userId])
    return null
}
