'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { registerMentor } from './actions'

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

    return (
        <div className="flex min-h-screen lg:h-screen lg:overflow-hidden bg-white selection:bg-accent/30 selection:text-accent">
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-accent p-16 relative overflow-hidden lg:sticky lg:top-0 lg:h-screen">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-white rounded-full blur-[120px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="z-10"
                >
                    <div className="flex items-center gap-4 mb-12">
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            width={60}
                            height={60}
                            className="[mix-blend-mode:screen]"
                        />
                        <span className="text-3xl font-bold text-white tracking-tight">
                            Access Oxbridge
                        </span>
                    </div>

                    <div className="mt-20 xl:mt-24">
                        <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                            Become a mentor
                        </h2>
                        <p className="text-white/70 text-lg leading-relaxed max-w-md mb-10">
                            Create an account, complete a short application, then wait while we review it. You will only start mentoring after we approve you.
                        </p>
                        <ol className="space-y-5 text-white">
                            <li className="flex gap-4">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">1</span>
                                <span className="pt-1 font-medium">Create your mentor account</span>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">2</span>
                                <span className="pt-1 font-medium">Fill in your application</span>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">3</span>
                                <span className="pt-1 font-medium">We review it, usually within 24 to 48 hours</span>
                            </li>
                        </ol>
                    </div>
                </motion.div>

                <div className="z-10 text-white/60 text-sm font-medium">
                    © 2026 Access Oxbridge. All rights reserved.
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center lg:items-start justify-center p-6 md:p-12 lg:p-16 lg:pt-16 lg:h-screen lg:overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-md"
                >
                    <div className="lg:hidden mb-8 flex flex-col items-center">
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            width={50}
                            height={50}
                            className="mb-4 rounded-xl shadow-lg"
                        />
                        <h1 className="text-2xl font-bold text-accent">Access Oxbridge</h1>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Create your mentor account</h1>
                    </div>

                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-medium text-red-700">
                            {errorMessage}{' '}
                            {error === 'exists' && (
                                <Link href="/login" className="underline font-bold">
                                    Log in
                                </Link>
                            )}
                        </div>
                    )}

                    <form className="relative space-y-6" onSubmit={() => setIsLoading(true)}>
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

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="full_name">
                                Full name
                            </label>
                            <input
                                id="full_name"
                                name="full_name"
                                type="text"
                                required
                                autoComplete="name"
                                placeholder="Jane Smith"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 text-gray-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="email">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setIsEmailTouched(true)}
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 ${showEmailError
                                    ? 'border-red-300 focus:ring-red-100'
                                    : 'border-gray-200 focus:ring-accent/20 focus:border-accent'
                                    }`}
                            />
                            {showEmailError && (
                                <p className="text-xs text-red-500 font-medium ml-1">
                                    Please enter a valid email address
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="password">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setIsTouched(true)}
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 ${showValidation
                                    ? 'border-red-300 focus:ring-red-100'
                                    : 'border-gray-200 focus:ring-accent/20 focus:border-accent'
                                    }`}
                            />
                            {showValidation && (
                                <div className="p-3 bg-red-50 rounded-lg space-y-2 mt-2">
                                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Password must include:</p>
                                    <ul className="text-xs space-y-1">
                                        <li className={validation.minLength ? 'text-green-600' : 'text-red-500'}>
                                            <span className="inline-block w-4">{validation.minLength ? '✓' : '•'}</span>
                                            At least 8 characters
                                        </li>
                                        <li className={validation.hasUppercase ? 'text-green-600' : 'text-red-500'}>
                                            <span className="inline-block w-4">{validation.hasUppercase ? '✓' : '•'}</span>
                                            At least one uppercase letter
                                        </li>
                                        <li className={validation.hasLowercase ? 'text-green-600' : 'text-red-500'}>
                                            <span className="inline-block w-4">{validation.hasLowercase ? '✓' : '•'}</span>
                                            At least one lowercase letter
                                        </li>
                                        <li className={validation.hasNumber ? 'text-green-600' : 'text-red-500'}>
                                            <span className="inline-block w-4">{validation.hasNumber ? '✓' : '•'}</span>
                                            At least one number
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="confirm_password">
                                Confirm password
                            </label>
                            <input
                                id="confirm_password"
                                name="confirm_password"
                                type="password"
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 ${showMismatch
                                    ? 'border-red-300 focus:ring-red-100'
                                    : 'border-gray-200 focus:ring-accent/20 focus:border-accent'
                                    }`}
                            />
                            {showMismatch && (
                                <p className="text-xs text-red-500 font-medium ml-1">
                                    Passwords do not match
                                </p>
                            )}
                        </div>

                        <button
                            formAction={registerMentor}
                            disabled={!canSubmit}
                            className={`w-full py-4 px-4 rounded-xl text-white font-bold text-base shadow-lg transition-all duration-300 transform active:scale-[0.98] ${canSubmit
                                ? 'bg-accent hover:bg-[#07214d] hover:shadow-accent/40'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                                } flex items-center justify-center gap-2`}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating account...
                                </span>
                            ) : (
                                'Create mentor account'
                            )}
                        </button>

                        <p className="text-center text-xs text-gray-400">
                            By continuing, you agree to our{' '}
                            <a href="https://www.accessoxbridge.io/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Terms of Service</a>
                            {' '}and{' '}
                            <a href="https://www.accessoxbridge.io/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Privacy Policy</a>.
                        </p>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-gray-600 font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="text-accent font-bold hover:underline decoration-2 underline-offset-4">
                                Log in
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
