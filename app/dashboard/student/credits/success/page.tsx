import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, ArrowRight, LayoutDashboard } from 'lucide-react'

export default async function SuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id: string }>
}) {
    const params = await searchParams;
    const sessionId = params.session_id

    if (!sessionId) {
        redirect('/dashboard/student')
    }

    const supabase = await createClient()

    // 1. Fetch purchase details using the session_id
    const { data: purchase, error } = await supabase
        .from('credit_purchases')
        .select(`
            *,
            credit_packages (
                name,
                credits
            )
        `)
        .eq('stripe_session_id', sessionId)
        .single()

    if (error || !purchase) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Purchase Not Found</h1>
                <p className="text-gray-600 mb-8 max-w-md">
                    We couldn't find the purchase details for this session. It might have already been processed or the ID is invalid.
                </p>
                <Link
                    href="/dashboard/student"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                    <LayoutDashboard className="mr-2 h-5 w-5" />
                    Return to Dashboard
                </Link>
            </div>
        )
    }

    const { status, credit_packages } = purchase
    const isPending = status === 'pending'
    const isCompleted = status === 'completed'

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-6 ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600 animate-pulse'
                }`}>
                {isCompleted ? (
                    <CheckCircle2 className="h-10 w-10" />
                ) : (
                    <div className="h-10 w-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isCompleted ? 'Payment Successful!' : 'Processing Payment...'}
            </h1>

            <p className="text-gray-600 mb-8 max-w-lg text-lg">
                {isCompleted
                    ? `You've successfully purchased ${credit_packages?.credits} credits. They have been added to your account.`
                    : 'We have received your payment and are verifying the transaction. Your credits will be added shortly.'}
            </p>

            {isCompleted && (
                <div className="mb-10 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm max-w-md w-full">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                        <span className="text-gray-500">Package</span>
                        <span className="font-semibold text-gray-900">{credit_packages?.name}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                        <span className="text-gray-500">Credits</span>
                        <span className="font-semibold text-gray-900">+{credit_packages?.credits}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Order ID</span>
                        <span className="font-mono text-sm text-gray-400">#{purchase.id.slice(0, 8)}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    href="/dashboard/student"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                    <LayoutDashboard className="mr-2 h-5 w-5" />
                    Go to Dashboard
                </Link>
                <Link
                    href="/dashboard/student/mentors"
                    className="inline-flex items-center px-6 py-3 border border-gray-200 text-base font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                    Find a Mentor
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </div>
        </div>
    )
}
