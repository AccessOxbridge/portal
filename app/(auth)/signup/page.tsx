'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useMemo, useEffect } from 'react'
import { signup } from '../../auth/actions'
import { motion, AnimatePresence } from 'framer-motion'

interface PasswordValidation {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
}

const DYNAMIC_WORDS = [
    "Securing Futures",
    "Join the Community",
    "Learn from Admissions Officers",
    "Exclusive Workshops",
    "Speak to Graduates"
]

function TypewriterEffect() {
    const [index, setIndex] = useState(0)
    const [subIndex, setSubIndex] = useState(0)
    const [reverse, setReverse] = useState(false)
    const [blink, setBlink] = useState(true)

    // Typewriter effect logic
    useEffect(() => {
        if (subIndex === DYNAMIC_WORDS[index].length + 1 && !reverse) {
            setReverse(true)
            return
        }

        if (subIndex === 0 && reverse) {
            setReverse(false)
            setIndex((prev) => (prev + 1) % DYNAMIC_WORDS.length)
            return
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1))
        }, Math.max(reverse ? 75 : subIndex === DYNAMIC_WORDS[index].length ? 2000 : 150, parseInt((Math.random() * 50).toString()) + 50))

        return () => clearTimeout(timeout)
    }, [subIndex, index, reverse])

    // Cursor blink logic
    useEffect(() => {
        const timeout2 = setTimeout(() => {
            setBlink((prev) => !prev)
        }, 500)
        return () => clearTimeout(timeout2)
    }, [blink])

    return (
        <p className="text-xl md:text-2xl text-white/80 font-light min-h-[1.5em] tracking-wide">
            {`${DYNAMIC_WORDS[index].substring(0, subIndex)}${blink ? "|" : " "}`}
        </p>
    )
}

export default function SignupPage() {
    const [password, setPassword] = useState('')
    const [isTouched, setIsTouched] = useState(false)
    const [email, setEmail] = useState('')
    const [isEmailTouched, setIsEmailTouched] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const isEmailValid = useMemo(() => {
        if (!email) return false
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }, [email])

    const showEmailError = isEmailTouched && email.length > 0 && !isEmailValid

    const validation: PasswordValidation = useMemo(() => ({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
    }), [password])

    const isPasswordValid = validation.minLength && validation.hasUppercase && validation.hasLowercase && validation.hasNumber

    const showValidation = isTouched && password.length > 0 && !isPasswordValid

    return (
        <div className="flex min-h-screen bg-white selection:bg-accent/30 selection:text-accent">
            {/* Left Section - Decorative Branding */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-accent p-16 relative overflow-hidden">
                {/* Background Pattern/Effect */}
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
                            src="/logo.webp"
                            alt="Logo"
                            width={60}
                            height={60}
                            className="rounded-xl shadow-2xl"
                        />
                        <motion.span
                            animate={{
                                scale: [1, 1.02, 1],
                                opacity: [0.9, 1, 0.9]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="text-3xl font-bold text-white tracking-tight"
                        >
                            Access Oxbridge
                        </motion.span>
                    </div>

                    <div className="mt-20">
                        <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                            Start Your Journey <br />
                            To Excellence.
                        </h2>
                        <TypewriterEffect />
                    </div>
                </motion.div>

                <div className="z-10 text-white/60 text-sm font-medium">
                    © {new Date().getFullYear()} Access Oxbridge. All rights reserved.
                </div>
            </div>

            {/* Right Section - Sign Up Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-16">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-md"
                >
                    <div className="lg:hidden mb-8 flex flex-col items-center">
                        <Image
                            src="/logo.webp"
                            alt="Logo"
                            width={50}
                            height={50}
                            className="mb-4 rounded-xl shadow-lg"
                        />
                        <h1 className="text-2xl font-bold text-accent">Access Oxbridge</h1>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Create Account</h1>
                        <p className="text-gray-500 font-medium">Join our community of future leaders and experts.</p>
                    </div>

                    <form className="space-y-6" onSubmit={() => setIsLoading(true)}>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="full_name">
                                Full Name
                            </label>
                            <input
                                id="full_name"
                                name="full_name"
                                type="text"
                                required
                                placeholder="John Doe"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 text-gray-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="email">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
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
                                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Security Requirements:</p>
                                    <ul className="text-xs space-y-1">
                                        <li className={validation.minLength ? 'text-green-600' : 'text-red-500'}>
                                            <span className="inline-block w-4 transition-transform duration-200">
                                                {validation.minLength ? '✓' : '•'}
                                            </span>
                                            At least 8 characters
                                        </li>
                                        <li className={validation.hasUppercase ? 'text-green-600' : 'text-red-500'}>
                                            <span className="inline-block w-4">
                                                {validation.hasUppercase ? '✓' : '•'}
                                            </span>
                                            At least one uppercase letter
                                        </li>
                                        <li className={validation.hasLowercase ? 'text-green-600' : 'text-red-500'}>
                                            <span className="inline-block w-4">
                                                {validation.hasLowercase ? '✓' : '•'}
                                            </span>
                                            At least one lowercase letter
                                        </li>
                                        <li className={validation.hasNumber ? 'text-green-600' : 'text-red-500'}>
                                            <span className="inline-block w-4">
                                                {validation.hasNumber ? '✓' : '•'}
                                            </span>
                                            At least one number
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="role">
                                I am joining as a...
                            </label>
                            <div className="relative">
                                <select
                                    id="role"
                                    name="role"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent appearance-none transition-all duration-200 text-gray-900"
                                >
                                    <option value="student">Student / Parent</option>
                                    <option value="mentor">Mentor</option>
                                    {process.env.NEXT_PUBLIC_ENV === 'dev' && (
                                        <>
                                            <option value="admin">Admin</option>
                                            <option value="admin-dev">Admin (Dev) - Access All</option>
                                        </>
                                    )}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <button
                            formAction={signup}
                            disabled={!isPasswordValid || !isEmailValid || isLoading}
                            className={`w-full py-4 px-4 rounded-xl text-white font-bold text-base shadow-lg transition-all duration-300 transform active:scale-[0.98] ${isPasswordValid && isEmailValid && !isLoading
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
                                "Create Account"
                            )}
                        </button>
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

