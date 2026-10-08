"use client"

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { EnvelopeSimpleOpen } from '@phosphor-icons/react/ssr'
import { resendEmail } from '../../auth/actions'
import { AuthCard, AuthNotice } from '@/components/auth/auth-card'
import { buttonVariants } from '@/components/ui/button'

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email')
    const status = searchParams.get('status')

    return (
        <AuthCard
            icon={EnvelopeSimpleOpen}
            tone="success"
            title="Check your email"
            description={
                <>
                    A confirmation link has been sent to <span className="font-semibold text-foreground [overflow-wrap:anywhere]">{email || 'your email address'}</span>. Please click the link to verify your account.
                </>
            }
        >
            {status === 'resent' && (
                <div className="mb-5">
                    <AuthNotice tone="success">Verification email sent again.</AuthNotice>
                </div>
            )}

            <Link href="/login" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
                Back to sign in
            </Link>

            <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
                <p>Didn&apos;t receive the email? Check your spam folder or try resending it.</p>
                <form className="mt-2">
                    <input type="hidden" name="email" value={email || ''} />
                    <button
                        formAction={resendEmail}
                        disabled={!email}
                        className="rounded-[4px] font-semibold text-brand outline-none hover:underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50 disabled:no-underline"
                    >
                        Resend verification email
                    </button>
                </form>
            </div>
        </AuthCard>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<p className="mt-20 text-center text-muted-foreground">Loading...</p>}>
            <VerifyEmailContent />
        </Suspense>
    )
}
