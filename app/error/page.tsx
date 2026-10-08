'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { WarningCircle } from '@phosphor-icons/react/ssr'
import { AuthCard } from '@/components/auth/auth-card'
import { buttonVariants } from '@/components/ui/button'

function ErrorContent() {
    const searchParams = useSearchParams()
    const message = searchParams.get('message')
    const from = searchParams.get('from') || '/login'

    return (
        <AuthCard
            icon={WarningCircle}
            tone="danger"
            title="Something went wrong"
            description={message || 'Sorry, an unexpected error occurred during authentication.'}
        >
            <Link href={from} className={buttonVariants({ size: 'lg', className: 'w-full' })}>
                Try again
            </Link>
        </AuthCard>
    )
}

export default function ErrorPage() {
    return (
        <Suspense fallback={<p className="mt-20 text-center text-muted-foreground">Loading...</p>}>
            <ErrorContent />
        </Suspense>
    )
}
