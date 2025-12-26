"use client"

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { resendEmail } from '../../auth/actions'

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email')
    const status = searchParams.get('status')

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
            <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md text-center">
                <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-green-100 p-3">
                        <svg
                            className="h-8 w-8 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                </div>
                <h1 className="text-2xl font-bold mb-4 text-gray-900">Check your email</h1>
                <p className="text-gray-600 mb-6">
                    A confirmation link has been sent to <span className="font-semibold">{email || 'your email address'}</span>. Please click the link to verify your account.
                </p>

                {status === 'resent' && (
                    <div className="mb-6 p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-100 font-medium">
                        Verification email has been resent!
                    </div>
                )}

                <div className="space-y-4">
                    <div className="text-sm text-gray-500">
                        <p>Didn't receive the email? Check your spam folder or try resending it.</p>
                        <form className="mt-2">
                            <input type="hidden" name="email" value={email || ''} />
                            <button
                                formAction={resendEmail}
                                disabled={!email}
                                className="text-indigo-600 font-bold hover:text-indigo-800 disabled:opacity-50"
                            >
                                Resend verification email
                            </button>
                        </form>
                    </div>

                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Return to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<p className="text-center mt-20">Loading...</p>}>
            <VerifyEmailContent />
        </Suspense>
    )
}
