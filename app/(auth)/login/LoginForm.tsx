'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { login } from '../../auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'

export function LoginForm({ notice }: { notice?: string }) {
    const [isLoading, setIsLoading] = useState(false)

    return (
        <div className="flex min-h-[100dvh] bg-background">
            {/* Brand panel (desktop): the sidebar navy and the logo, nothing
                more. Students and mentors both sign in here. */}
            <aside className="relative hidden w-[44%] max-w-2xl shrink-0 flex-col overflow-hidden bg-primary px-12 py-10 text-primary-foreground lg:flex xl:px-16">
                <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-white/[0.06] blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-32 size-[460px] rounded-full bg-brand/20 blur-3xl" />

                <div className="absolute inset-0 flex items-center px-12 xl:px-16">
                    <div className="flex items-center gap-5">
                        <Image src="/logo.png" alt="" width={88} height={88} priority className="shrink-0 [mix-blend-mode:screen]" />
                        <span className="text-4xl font-extrabold tracking-tight xl:text-5xl">Access Oxbridge</span>
                    </div>
                </div>

                <p className="relative mt-auto text-sm text-primary-foreground/60">© 2026 Access Oxbridge. All rights reserved.</p>
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
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance">Welcome back</h1>
                        <p className="mt-2 text-muted-foreground text-pretty">Sign in to your Access Oxbridge account.</p>
                    </div>

                    {notice && (
                        <div role="status" className="mb-6 rounded-control bg-tint-amber px-4 py-3 text-sm font-medium text-tint-amber-foreground ring-1 ring-warning/30">
                            {notice}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={() => setIsLoading(true)}>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="password">Password</Label>
                                <Link href="/forgot-password" className="rounded-[4px] text-sm font-medium text-brand outline-none hover:underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/40">
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button formAction={login} disabled={isLoading} loading={isLoading} size="lg" className="w-full">
                            {isLoading ? 'Signing in' : 'Sign in'}
                        </Button>

                        <p className="text-center text-xs leading-relaxed text-muted-foreground text-pretty">
                            By continuing, you agree to our{' '}
                            <a href="https://www.accessoxbridge.io/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Terms of Service</a>
                            {' '}and{' '}
                            <a href="https://www.accessoxbridge.io/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
                        </p>
                    </form>

                    <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
                        Want to become a mentor?{' '}
                        <Link href="/become-a-mentor" className="font-semibold text-brand hover:underline underline-offset-4">
                            Apply here
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    )
}
