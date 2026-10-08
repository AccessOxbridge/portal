import Link from 'next/link'
import { EnvelopeSimple, Key } from '@phosphor-icons/react/ssr'
import { forgotPassword } from '../../auth/actions'
import { AuthCard } from '@/components/auth/auth-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'

const linkClass = 'font-semibold text-brand hover:underline underline-offset-4'

function ForgotPasswordForm() {
    return (
        <AuthCard
            icon={Key}
            title="Reset your password"
            description="Enter your email address and we'll send you a link to reset your password."
            footer={
                <>
                    Remember your password?{' '}
                    <Link href="/login" className={linkClass}>
                        Back to sign in
                    </Link>
                </>
            }
        >
            <form className="space-y-5">
                <Field label="Email address" htmlFor="email">
                    <Input id="email" name="email" type="email" required autoComplete="email" placeholder="name@example.com" />
                </Field>
                <Button formAction={forgotPassword} size="lg" className="w-full">
                    Send reset link
                </Button>
            </form>
        </AuthCard>
    )
}

function SuccessMessage() {
    return (
        <AuthCard
            icon={EnvelopeSimple}
            tone="success"
            title="Check your email"
            description="We've sent you a password reset link. Open it on this device to choose a new password."
        >
            <Link href="/login" className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'w-full' })}>
                Back to sign in
            </Link>
        </AuthCard>
    )
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const params = await searchParams
    if (params.status === 'sent') {
        return <SuccessMessage />
    }

    return <ForgotPasswordForm />
}
