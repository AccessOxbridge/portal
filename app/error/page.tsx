'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
    const searchParams = useSearchParams()
    const message = searchParams.get('message')

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
            <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md text-center">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
                <p className="text-gray-600 mb-6">
                    {message || 'Sorry, an unexpected error occurred during authentication.'}
                </p>
                <Link
                    href="/signup"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Try Again
                </Link>
            </div>
        </div>
    )
}

export default function ErrorPage() {
    return (
        <Suspense fallback={<p>Loading...</p>}>
            <ErrorContent />
        </Suspense>
    )
}
