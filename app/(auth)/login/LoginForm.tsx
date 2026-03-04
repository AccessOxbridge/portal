'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { login } from '../../auth/actions'
import { motion } from 'framer-motion'

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false)

    return (
        <div className="flex min-h-screen lg:h-screen lg:overflow-hidden bg-white selection:bg-accent/30 selection:text-accent">
            {/* Left Section - Decorative Branding */}
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

                    <div className="mt-28 xl:mt-32">
                        <h2 className="text-5xl font-bold text-white mb-2 leading-tight">
                            Welcome Back
                        </h2>
                    </div>
                </motion.div>

                <div className="z-10 text-white/60 text-sm font-medium">
                    © 2026 Access Oxbridge. All rights reserved.
                </div>
            </div>

            {/* Right Section - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center lg:items-start justify-center p-6 md:p-12 lg:p-16 lg:pt-16 lg:h-screen lg:overflow-y-auto">
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
                            className="mb-4 rounded-xl shadow-lg bg-accent p-2"
                        />
                        <h1 className="text-2xl font-bold text-accent">Access Oxbridge</h1>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Login</h1>
                        <p className="text-gray-500 font-medium">Please enter your details to sign in.</p>
                    </div>

                    <form className="space-y-6" onSubmit={() => setIsLoading(true)}>
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
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 text-gray-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-semibold text-gray-700" htmlFor="password">
                                    Password
                                </label>
                                <Link href="/forgot-password" className="text-xs font-bold text-accent hover:underline decoration-2 underline-offset-4">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 text-gray-900"
                            />
                        </div>

                        <button
                            formAction={login}
                            disabled={isLoading}
                            className={`w-full py-4 px-4 rounded-xl text-white font-bold text-base shadow-lg transition-all duration-300 transform active:scale-[0.98] ${!isLoading
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
                                    Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-gray-100 pt-8">
                        <p className="text-gray-600 font-medium">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="text-accent font-bold hover:underline decoration-2 underline-offset-4">
                                Create one
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
