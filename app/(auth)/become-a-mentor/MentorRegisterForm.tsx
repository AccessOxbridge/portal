'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Check, Dot } from '@phosphor-icons/react/ssr'
import { registerMentor } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'
import { cn } from '@/utils/lib'

interface PasswordValidation {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
}

const ERROR_COPY: Record<string, string> = {
    invalid_name: 'Please enter your full name.',
    invalid_email: 'Please enter a valid email address.',
    weak_password: 'Please choose a stronger password.',
    password_mismatch: 'Passwords do not match.',
    rate_limited: 'Too many applications right now. Please try again in a few minutes.',
    exists: 'An account with this email already exists. Log in instead.',
    failed: 'We could not create your account. Please try again.',
}

export function MentorRegisterForm({ error }: { error?: string }) {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [email, setEmail] = useState('')
    const [isEmailTouched, setIsEmailTouched] = useState(false)
    const [isTouched, setIsTouched] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const isEmailValid = useMemo(() => {
        if (!email) return false
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }, [email])

    const showEmailError = isEmailTouched && email.length > 0 && !isEmailValid

    const validation: PasswordValidation = useMemo(() => ({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
    }), [password])

    const isPasswordValid = validation.minLength && validation.hasUppercase && validation.hasLowercase && validation.hasNumber
    const passwordsMatch = password.length > 0 && password === confirmPassword
    const showValidation = isTouched && password.length > 0 && !isPasswordValid
    const showMismatch = confirmPassword.length > 0 && !passwordsMatch

    const errorMessage = error ? (ERROR_COPY[error] || ERROR_COPY.failed) : null
    const canSubmit = isPasswordValid && isEmailValid && passwordsMatch && !isLoading

    const rule = (ok: boolean, text: string) => (
        <li className={cn('flex items-center gap-1.5', ok ? 'text-success' : 'text-destructive')}>
            {ok ? <Check weight="bold" className="size-3.5 shrink-0" /> : <Dot weight="bold" className="size-3.5 shrink-0" />}
            {text}
        </li>
    )

    return (
        <div className="flex min-h-[100dvh] bg-background">
            {/* Brand panel (desktop): the same frame as the login page. */}
            <aside className="relative hidden w-[44%] max-w-2xl shrink-0 flex-col overflow-hidden bg-primary px-12 py-10 text-primary-foreground lg:flex xl:px-16">
                <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-white/[0.06] blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-32 size-[460px] rounded-full bg-brand/20 blur-3xl" />

                <div className="relative flex items-center gap-4">
                    <Image src="/logo.png" alt="" width={56} height={56} priority className="shrink-0 [mix-blend-mode:screen]" />
                    <span className="text-2xl font-extrabold tracking-tight">Access Oxbridge</span>
                </div>

                <div className="relative my-auto max-w-md py-10">
                    <h2 className="text-4xl font-semibold leading-tight tracking-tight text-balance xl:text-5xl">Become a mentor</h2>
                    <p className="mt-5 text-lg leading-relaxed text-primary-foreground/75 text-pretty">
                        Create an account, complete a short application, then wait while we review it. You will only start mentoring after we approve you.
                    </p>
                    <ol className="mt-10 space-y-4">
                        {['Create your mentor account', 'Fill in your application', 'We review it, usually within 24 to 48 hours'].map((step, i) => (
                            <li key={step} className="flex items-center gap-3.5 text-base font-medium">
                                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold tabular-nums ring-1 ring-white/15">{i + 1}</span>
                                {step}
                            </li>
                        ))}
                    </ol>
                </div>

                <p className="relative text-sm text-primary-foreground/60">© 2026 Access Oxbridge. All rights reserved.</p>
            </aside>

            {/* Form */}
            <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
                        <span className="grid size-11 place-items-center rounded-full bg-primary">
                            <Image src="/logo.png" alt="" width={32} height={32} className="[mix-blend-mode:screen]" />
                        </span>
                        <span className="text-xl font-extrabold tracking-tight text-primary">Access Oxbridge</span>
                    </div>

                    <div className="mb-8 text-center lg:text-left">
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance">Create your mentor account</h1>
                        <p className="mt-2 text-muted-foreground text-pretty lg:hidden">You&apos;ll fill in a short application next. We review it within 24 to 48 hours.</p>
                    </div>

                    {errorMessage && (
                        <div role="alert" className="mb-6 rounded-control bg-tint-rose px-4 py-3 text-sm font-medium text-tint-rose-foreground ring-1 ring-destructive/20">
                            {errorMessage}{' '}
                            {error === 'exists' && (
                                <Link href="/login" className="font-semibold underline underline-offset-2">
                                    Log in
                                </Link>
                            )}
                        </div>
                    )}

                    <form className="relative space-y-5" onSubmit={() => setIsLoading(true)}>
                        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                            <label htmlFor="company_website">Company website</label>
                            <input
                                id="company_website"
                                name="company_website"
                                type="text"
                                tabIndex={-1}
                                autoComplete="off"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="full_name">Full name</Label>
                            <Input
                                id="full_name"
                                name="full_name"
                                type="text"
                                required
                                autoComplete="name"
                                placeholder="Jane Smith"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setIsEmailTouched(true)}
                                aria-invalid={showEmailError || undefined}
                            />
                            {showEmailError && (
                                <p className="text-sm text-destructive">
                                    Please enter a valid email address
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setIsTouched(true)}
                                aria-invalid={showValidation || undefined}
                            />
                            {showValidation && (
                                <div className="mt-1 rounded-control bg-tint-rose/60 px-3 py-2.5">
                                    <p className="text-xs font-semibold text-foreground">Password must include:</p>
                                    <ul className="mt-1.5 space-y-1 text-xs">
                                        {rule(validation.minLength, 'At least 8 characters')}
                                        {rule(validation.hasUppercase, 'At least one uppercase letter')}
                                        {rule(validation.hasLowercase, 'At least one lowercase letter')}
                                        {rule(validation.hasNumber, 'At least one number')}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="confirm_password">Confirm password</Label>
                            <Input
                                id="confirm_password"
                                name="confirm_password"
                                type="password"
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                aria-invalid={showMismatch || undefined}
                            />
                            {showMismatch && (
                                <p className="text-sm text-destructive">
                                    Passwords do not match
                                </p>
                            )}
                        </div>

                        <Button formAction={registerMentor} disabled={!canSubmit} loading={isLoading} size="lg" className="w-full">
                            {isLoading ? 'Creating account' : 'Create mentor account'}
                        </Button>

                        <p className="text-center text-xs leading-relaxed text-muted-foreground text-pretty">
                            By continuing, you agree to our{' '}
                            <a href="https://www.accessoxbridge.io/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Terms of Service</a>
                            {' '}and{' '}
                            <a href="https://www.accessoxbridge.io/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
                        </p>
                    </form>

                    <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold text-brand hover:underline underline-offset-4">
                            Log in
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    )
}
