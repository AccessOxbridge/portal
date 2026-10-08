import Link from 'next/link'
import { ClockCountdown, LockKey } from '@phosphor-icons/react/ssr'
import { resetPassword } from '../../auth/actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AuthCard, AuthNotice } from '@/components/auth/auth-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'

const linkClass = 'font-semibold text-brand hover:underline underline-offset-4'

function ErrorMessage({ error, errorCode, errorDescription }: {
    error?: string,
    errorCode?: string,
    errorDescription?: string
}) {
    return (
        <AuthNotice tone="danger" title={errorCode === 'otp_expired' ? 'Link expired' : 'Error'}>
            {errorDescription || error || 'This password reset link is invalid or has expired. Please request a new one.'}
        </AuthNotice>
    )
}

export default async function ResetPasswordPage({ searchParams }: {
    searchParams: Promise<{ error?: string, error_code?: string, error_description?: string, message?: string }>
}) {
    const params = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If there's an error from Supabase (e.g., link expired)
    if (params.error) {
        return (
            <AuthCard
                icon={ClockCountdown}
                tone="danger"
                title="Reset link error"
                footer={
                    <Link href="/login" className={linkClass}>
                        Back to sign in
                    </Link>
                }
            >
                <ErrorMessage
                    error={params.error}
                    errorCode={params.error_code}
                    errorDescription={params.error_description}
                />
                <Link href="/forgot-password" className={buttonVariants({ size: 'lg', className: 'mt-5 w-full' })}>
                    Request new reset link
                </Link>
            </AuthCard>
        )
    }

    // If no recovery session and no error, this is likely an unauthorized access attempt
    if (!user) {
        redirect('/login')
    }

    return (
        <AuthCard
            icon={LockKey}
            title="Set new password"
            description="Enter your new password below."
            footer={
                <>
                    Remember your password?{' '}
                    <Link href="/login" className={linkClass}>
                        Back to sign in
                    </Link>
                </>
            }
        >
            {params.message && (
                <div className="mb-5">
                    <AuthNotice tone="danger">{params.message}</AuthNotice>
                </div>
            )}
            <form className="space-y-5">
                <Field label="New password" htmlFor="password" help="At least 6 characters.">
                    <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
                </Field>
                <Field label="Confirm new password" htmlFor="confirmPassword">
                    <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} autoComplete="new-password" />
                </Field>
                <Button formAction={resetPassword} size="lg" className="w-full">
                    Update password
                </Button>
            </form>
        </AuthCard>
    )
}
