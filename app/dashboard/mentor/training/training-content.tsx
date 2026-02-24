'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
    GraduationCap,
    FileText,
    Shield,
    CreditCard,
    User,
    Check,
    ChevronRight,
    Loader2,
    Upload,
    BookOpen,
    AlertCircle
} from 'lucide-react'
import { completeTraining, completeQuiz, signContract, submitBackgroundCheck, completeProfile } from './actions'
import { StripeOnboardingButton } from '@/components/dashboard/stripe-onboarding-button'
import { COUNTRIES } from '@/config/countries'

interface OnboardingStatus {
    training: boolean
    quiz: boolean
    contract: boolean
    dbs: boolean
    payment: boolean
    profile: boolean
}

interface ExistingData {
    photo_url?: string | null
    bio?: string | null
    expertise?: string[] | null
    university?: string | null
    phone?: string | null
    stripeConnected: boolean
    payoutsEnabled: boolean
    contractSignature?: string | null
    dbsCertificateUrl?: string | null
}

interface TrainingContentProps {
    mentorId: string
    mentorName: string
    onboardingStatus: OnboardingStatus
    initialStep?: number
    existingData: ExistingData
}

const STEPS = [
    { id: 'welcome', title: 'Welcome', icon: GraduationCap },
    { id: 'training', title: 'Training', icon: BookOpen },
    { id: 'quiz', title: 'Quiz', icon: FileText },
    { id: 'contract', title: 'Contract', icon: FileText },
    { id: 'dbs', title: 'Background Checks', icon: Shield },
    { id: 'payment', title: 'Payment', icon: CreditCard },
    { id: 'profile', title: 'Profile', icon: User },
]

// Placeholder quiz questions - to be replaced with actual content
const QUIZ_QUESTIONS = [
    {
        id: 'q1',
        question: 'What is the primary goal of Access Oxbridge mentorship?',
        options: [
            'A) To provide academic tutoring only',
            'B) To help students achieve their academic goals and unlock their potential',
            'C) To prepare students for exams',
            'D) To teach specific subjects'
        ],
        correct: 'B'
    },
    {
        id: 'q2',
        question: 'How should you handle a student who is struggling with confidence?',
        options: [
            'A) Focus only on academic content',
            'B) Provide encouragement and help build their self-belief',
            'C) Tell them to work harder',
            'D) Skip to the next topic'
        ],
        correct: 'B'
    },
    {
        id: 'q3',
        question: 'What should you do after each session?',
        options: [
            'A) Nothing, just wait for the next session',
            'B) Submit a session report to help generate personalized feedback',
            'C) Send the student homework',
            'D) Contact the parents'
        ],
        correct: 'B'
    }
]

export default function TrainingContent({
    mentorId,
    mentorName,
    onboardingStatus,
    initialStep = 0,
    existingData
}: TrainingContentProps) {
    const [currentStep, setCurrentStep] = useState(Math.max(0, Math.min(initialStep, 6)))
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    // Form states
    const [signature, setSignature] = useState(existingData.contractSignature || '')
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
    const [quizSubmitted, setQuizSubmitted] = useState(onboardingStatus.quiz)
    const [backgroundCheckConfirmed, setBackgroundCheckConfirmed] = useState(false)
    // Phone display state (read-only here; populated from existingData.phone)
    const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === 'GB')!
    const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY)
    const [phoneDigits, setPhoneDigits] = useState('')

    // Local status for optimistic updates
    const [localStatus, setLocalStatus] = useState(onboardingStatus)

    // Upload UI state for background checks
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<number>(0)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
    const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null)
    const xhrRef = useRef<XMLHttpRequest | null>(null)

    const isAllCompleted = Object.values(localStatus).every(Boolean)

    // Parse existing phone (from onboarding) into country + digits on mount / when existingData changes
    useEffect(() => {
        const raw = existingData.phone ?? ''
        if (!raw || raw.trim() === '') {
            // No phone saved yet: default to UK and empty digits
            setSelectedCountry(DEFAULT_COUNTRY)
            setPhoneDigits('')
            return
        }

        // Remove spaces and non-digit/+ characters for parsing
        const normalized = raw.replace(/\s+/g, '')
        // If it starts with +, try to match a country dial code
        if (normalized.startsWith('+')) {
            const digitsOnly = normalized.replace(/\D/g, '')
            // Find longest matching dial code (some have prefixes like 1-242, so remove non-digits)
            let matched: typeof DEFAULT_COUNTRY | undefined
            for (const c of COUNTRIES) {
                const dial = c.dialCode.replace(/\D/g, '')
                if (dial && digitsOnly.startsWith(dial)) {
                    // prefer longest match
                    if (!matched || dial.length > matched.dialCode.replace(/\D/g, '').length) {
                        matched = c
                    }
                }
            }

            if (matched) {
                const dialLen = matched.dialCode.replace(/\D/g, '').length
                const remaining = digitsOnly.slice(dialLen)
                setSelectedCountry(matched)
                setPhoneDigits(remaining.slice(0, 10))
                return
            }
        }

        // Fallback: treat as local UK number (digits only)
        const fallbackDigits = raw.replace(/\D/g, '').slice(0, 10)
        setSelectedCountry(DEFAULT_COUNTRY)
        setPhoneDigits(fallbackDigits)
    }, [existingData.phone])

    // Helper to format local digits for display e.g. 7123456789 -> "712 345 6789"
    function formatLocalNumber(digits: string) {
        if (!digits) return ''
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return digits.replace(/(\d{3})(\d+)/, '$1 $2')
        // 7-10 digits => 3-3-remaining (usually 4)
        return digits.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3')
    }

    const handleCompleteTraining = () => {
        setError(null)
        startTransition(async () => {
            const result = await completeTraining()
            if (result.error) {
                setError(result.error)
            } else {
                setLocalStatus(prev => ({ ...prev, training: true }))
                setCurrentStep(2) // Move to quiz
            }
        })
    }

    const handleSubmitQuiz = () => {
        setError(null)

        // Check if all questions are answered
        if (Object.keys(quizAnswers).length < QUIZ_QUESTIONS.length) {
            setError('Please answer all questions before submitting')
            return
        }

        startTransition(async () => {
            const result = await completeQuiz(quizAnswers)
            if (result.error) {
                setError(result.error)
            } else {
                setQuizSubmitted(true)
                setLocalStatus(prev => ({ ...prev, quiz: true }))
                setCurrentStep(3) // Move to contract
            }
        })
    }

    const handleSignContract = () => {
        setError(null)
        if (!signature.trim() || signature.trim().length < 2) {
            setError('Please enter your full name as signature')
            return
        }

        startTransition(async () => {
            const result = await signContract(signature)
            if (result.error) {
                setError(result.error)
            } else {
                setLocalStatus(prev => ({ ...prev, contract: true }))
                setCurrentStep(4) // Move to DBS
            }
        })
    }

    const handleBackgroundCheckSubmit = async (formFile: File | null, confirmed: boolean) => {
        setError(null)
        setUploadError(null)
        setIsUploading(true)
        setUploadProgress(0)
        // Keep the last file so we can retry if needed
        setUploadedFileUrl(null)

        if (formFile) setLastSelectedFile(formFile)

        // Use XHR so we can show byte-level progress
        await new Promise<void>((resolve, reject) => {
            try {
                const xhr = new XMLHttpRequest()
                xhrRef.current = xhr
                xhr.open('POST', '/api/mentor/background-check')

                xhr.upload.onprogress = (ev: ProgressEvent) => {
                    if (ev.lengthComputable) {
                        setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
                    }
                }

                xhr.onload = () => {
                    try {
                        const res = JSON.parse(xhr.responseText)
                        if (xhr.status >= 400 || res?.error) {
                            setUploadError(res?.error || 'Upload failed')
                            setIsUploading(false)
                            reject(new Error(res?.error || 'Upload failed'))
                        } else {
                            if (res?.url) {
                                setUploadedFileUrl(res.url as string)
                                setUploadedFileName(formFile?.name ?? null)
                            }
                            setUploadProgress(100)
                            setLocalStatus(prev => ({ ...prev, dbs: true }))
                            setIsUploading(false)
                            resolve()
                        }
                    } catch (err) {
                        setUploadError('Upload failed')
                        setIsUploading(false)
                        reject(err)
                    }
                }

                xhr.onerror = () => {
                    setUploadError('Network error during upload')
                    setIsUploading(false)
                    reject(new Error('Network error'))
                }

                const fd = new FormData()
                if (formFile) fd.set('dbs_certificate', formFile)
                if (confirmed) fd.set('background_check_confirm', '1')

                xhr.send(fd)
            } catch (err) {
                setUploadError('Upload failed')
                setIsUploading(false)
                reject(err)
            }
        })

        xhrRef.current = null
    }

    const handleRetryUpload = async () => {
        if (!lastSelectedFile) return
        await handleBackgroundCheckSubmit(lastSelectedFile, backgroundCheckConfirmed)
    }

    const handleCancelUpload = () => {
        if (xhrRef.current) {
            xhrRef.current.abort()
            xhrRef.current = null
        }
        setIsUploading(false)
        setUploadError(null)
        setUploadedFileUrl(null)
        setUploadedFileName(null)
        setLastSelectedFile(null)
        setUploadProgress(0)
    }

    const handleCompleteProfile = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            const result = await completeProfile(formData)
            if (result.error) {
                setError(result.error)
            } else {
                setLocalStatus(prev => ({ ...prev, profile: true }))
            }
        })
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="text-center">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Training & Onboarding
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Complete all steps to start receiving student allocations
                </p>
            </header>

            {/* Progress Steps */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between overflow-x-auto overflow-y-visible pt-2 pb-2 px-4 no-scrollbar">
                {STEPS.map((step, index) => {
                        const stepKey = step.id
                        // Consider "welcome" completed only after the user advances past it.
                        const isCompleted = stepKey === 'welcome' ? currentStep > 0 : localStatus[stepKey as keyof OnboardingStatus]
                        const isCurrent = index === currentStep
                        const Icon = step.icon

                        return (
                            <button
                                key={step.id}
                                onClick={() => setCurrentStep(index)}
                                className={`flex flex-col items-center gap-2 min-w-[80px] px-2 transition-all ${isCurrent ? 'scale-110' : 'hover:scale-105'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCompleted
                                    ? 'bg-green-500 text-white z-10'
                                    : isCurrent
                                        ? 'bg-accent text-white blink-slow ring-2 ring-accent/40 z-10'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {isCompleted ? (
                                        <Check className="w-6 h-6" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>
                                <span className={`text-xs font-medium ${isCurrent ? 'text-accent' : isCompleted ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                    {step.title}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Scoped styles for current step blinking */}
            <style jsx>{`
                /* Hide horizontal scrollbar while keeping scroll functionality */
                .no-scrollbar {
                    -ms-overflow-style: none; /* IE and Edge */
                    scrollbar-width: none; /* Firefox */
                }
                .no-scrollbar::-webkit-scrollbar {
                    height: 0;
                    display: none;
                }
                .blink-slow {
                    animation: blink 1.6s ease-in-out infinite;
                }
                @keyframes blink {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.06); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Step Content */}
            <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-lg">
                {/* Step 0: Welcome */}
                {currentStep === 0 && (
                    <div className="space-y-6 text-center max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                            <GraduationCap className="w-10 h-10 text-accent" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">
                            Welcome to the Access Oxbridge Team
                        </h2>
                        <p className="text-xl text-accent font-medium">
                            We are so glad to have you, {mentorName}! 🎉
                        </p>
                        <div className="bg-rich-beige-accent/50 rounded-2xl p-6 text-left space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                At accessoxbridge we will do everything we possibly can to ensure the success of our students.
                                We require all of our team members to complete this onboarding and training.
                            </p>
                            <p className="text-accent font-semibold">
                                As soon as this 25 minute training is done, you can start receiving allocations immediately!
                            </p>
                        </div>
                        <button
                            onClick={() => setCurrentStep(1)}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                        >
                            Let's Get Started
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Step 1: Training Content */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
                                <BookOpen className="w-7 h-7 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Training Content</h2>
                                <p className="text-gray-500">Estimated time: 25 minutes</p>
                            </div>
                        </div>

                        {localStatus.training ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-green-700 font-semibold">Training Completed!</p>
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                >
                                    Continue to Quiz
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-gray-50 rounded-2xl p-8 border-2 border-dashed border-gray-200">
                                    <p className="text-center text-gray-600 text-lg">
                                        We will provide more details shortly
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleCompleteTraining}
                                        disabled={isPending}
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                Mark Training Complete
                                                <ChevronRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 2: Quiz */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                                <FileText className="w-7 h-7 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Training Quiz</h2>
                                <p className="text-gray-500">Confirm your understanding</p>
                            </div>
                        </div>

                        {quizSubmitted ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-green-700 font-semibold">Quiz Completed!</p>
                                <button
                                    onClick={() => setCurrentStep(3)}
                                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                >
                                    Continue to Contract
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    {QUIZ_QUESTIONS.map((q, index) => (
                                        <div key={q.id} className="bg-gray-50 rounded-2xl p-6">
                                            <p className="font-semibold text-gray-900 mb-4">
                                                {index + 1}. {q.question}
                                            </p>
                                            <div className="space-y-2">
                                                {q.options.map((option) => {
                                                    const optionLetter = option.charAt(0)
                                                    return (
                                                        <label
                                                            key={option}
                                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${quizAnswers[q.id] === optionLetter
                                                                ? 'bg-accent/10 border-2 border-accent'
                                                                : 'bg-white border-2 border-gray-100 hover:border-gray-200'
                                                                }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={q.id}
                                                                value={optionLetter}
                                                                checked={quizAnswers[q.id] === optionLetter}
                                                                onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: optionLetter }))}
                                                                className="w-4 h-4 text-accent"
                                                            />
                                                            <span className="text-gray-700">{option}</span>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSubmitQuiz}
                                        disabled={isPending}
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                Submit Quiz
                                                <ChevronRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 3: Contract */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                                <FileText className="w-7 h-7 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Mentor Contract</h2>
                                <p className="text-gray-500">Review and sign the agreement</p>
                            </div>
                        </div>

                        {localStatus.contract ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-green-700 font-semibold">Contract Signed!</p>
                                <p className="text-green-600 text-sm mt-1">
                                    Signed by: {existingData.contractSignature || signature}
                                </p>
                                <button
                                    onClick={() => setCurrentStep(4)}
                                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                >
                                    Continue to Background Checks
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Contract content placeholder */}
                                <div className="bg-gray-50 rounded-2xl p-6 max-h-64 overflow-y-auto border border-gray-200">
                                    <h3 className="font-bold text-gray-900 mb-4">MENTOR AGREEMENT</h3>
                                    <div className="space-y-4 text-sm text-gray-600">
                                        <p><strong>1. Role and Responsibilities</strong></p>
                                        <p>As a mentor with Access Oxbridge, you agree to provide mentorship services to students assigned to you...</p>

                                        <p><strong>2. Confidentiality</strong></p>
                                        <p>You agree to maintain the confidentiality of all student information and session details...</p>

                                        <p><strong>3. Professional Conduct</strong></p>
                                        <p>You agree to conduct yourself professionally at all times and adhere to our code of conduct...</p>

                                        <p><strong>4. Session Reports</strong></p>
                                        <p>You agree to submit session reports within 24 hours of each mentoring session...</p>

                                        <p className="text-gray-400 italic">
                                            [Full contract terms to be provided]
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block">
                                        <span className="text-sm font-medium text-gray-700">
                                            Digital Signature (Enter your full name)
                                        </span>
                                        <input
                                            type="text"
                                            value={signature}
                                            onChange={(e) => setSignature(e.target.value)}
                                            placeholder="Your full name"
                                            className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-serif text-lg"
                                        />
                                    </label>
                                    <p className="text-sm text-gray-500">
                                        By typing your name above, you agree to the terms of this contract.
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSignContract}
                                        disabled={isPending || !signature.trim()}
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Signing...
                                            </>
                                        ) : (
                                            <>
                                                Sign Contract
                                                <ChevronRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 4: Background Checks */}
                {currentStep === 4 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                                <Shield className="w-7 h-7 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Background Checks</h2>
                                <p className="text-gray-500">DBS and confirmation</p>
                            </div>
                        </div>

                        {localStatus.dbs ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-green-700 font-semibold">Background checks complete</p>
                                {uploadedFileUrl && (
                                    <p className="text-green-600 text-sm mt-2">
                                        File:{' '}
                                        <a href={uploadedFileUrl} target="_blank" rel="noreferrer" className="underline">
                                            {uploadedFileName ?? uploadedFileUrl}
                                        </a>
                                    </p>
                                )}
                                {!uploadedFileUrl && (
                                    <p className="text-green-600 text-sm mt-2">
                                        Confirmation submitted (no DBS file uploaded).
                                    </p>
                                )}
                                <button
                                    onClick={() => setCurrentStep(5)}
                                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                >
                                    Continue to Payment Setup
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-700">
                                    If you have been explicitly required to provide us with a DBS, please attach DBS below.
                                </p>

                                {/* Upload states and controls */}
                                <BackgroundUploadForm
                                    onSubmitHandler={handleBackgroundCheckSubmit}
                                    backgroundCheckConfirmed={backgroundCheckConfirmed}
                                    setBackgroundCheckConfirmed={setBackgroundCheckConfirmed}
                                    isUploading={isUploading}
                                    uploadError={uploadError}
                                    uploadedFileUrl={uploadedFileUrl}
                                    uploadedFileName={uploadedFileName}
                                    lastSelectedFile={lastSelectedFile}
                                    uploadProgress={uploadProgress}
                                    onRetry={handleRetryUpload}
                                    onCancel={handleCancelUpload}
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Step 5: Payment Setup */}
                {currentStep === 5 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-[#635BFF]/10 rounded-2xl flex items-center justify-center">
                                <CreditCard className="w-7 h-7 text-[#635BFF]" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Payment Setup</h2>
                                <p className="text-gray-500">Connect your bank account to receive payouts</p>
                            </div>
                        </div>

                        {localStatus.payment ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-green-700 font-semibold">Payment Connected!</p>
                                <p className="text-green-600 text-sm mt-1">
                                    Your Stripe account is set up and ready to receive payouts.
                                </p>
                                <button
                                    onClick={() => setCurrentStep(6)}
                                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                >
                                    Continue to Profile
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-gray-50 rounded-2xl p-6 text-center">
                                    <p className="text-gray-600 mb-6">
                                        Connect your bank account through Stripe to receive fortnightly payouts for your mentoring sessions.
                                        Stripe handles all payments securely.
                                    </p>

                                    {existingData.stripeConnected ? (
                                        <div className="space-y-4">
                                            <p className="text-amber-600 font-medium">
                                                You've started the Stripe setup but it's not complete yet.
                                            </p>
                                            <StripeOnboardingButton variant="continue" />
                                        </div>
                                    ) : (
                                        <StripeOnboardingButton variant="setup" />
                                    )}
                                </div>

                                <div className="text-center">
                                    <button
                                        onClick={() => setCurrentStep(6)}
                                        className="text-gray-500 text-sm hover:text-gray-700 underline"
                                    >
                                        Skip for now (you can set this up later)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 6: Profile Completion */}
                {currentStep === 6 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
                                <User className="w-7 h-7 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
                                <p className="text-gray-500">Add details to attract more students</p>
                            </div>
                        </div>

                        {localStatus.profile ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-green-700 font-semibold text-xl">Profile Completed!</p>
                                <p className="text-green-600 mt-2">
                                    🎉 Congratulations! You've completed all onboarding steps.
                                </p>
                                <a
                                    href="/dashboard/mentor"
                                    className="mt-6 inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                >
                                    Go to Dashboard
                                    <ChevronRight className="w-5 h-5" />
                                </a>
                            </div>
                        ) : (
                            <form onSubmit={handleCompleteProfile} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Profile Photo *
                                    </label>
                                    <div className="flex items-center gap-4">
                                        {existingData.photo_url ? (
                                            <img
                                                src={existingData.photo_url}
                                                alt="Profile"
                                                className="w-20 h-20 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                                                <User className="w-8 h-8 text-gray-400" />
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            name="photo"
                                            accept="image/*"
                                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        name="bio"
                                        rows={4}
                                        defaultValue={existingData.bio || ''}
                                        placeholder="Tell students about yourself, your background, and what makes you a great mentor..."
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            University
                                        </label>
                                        <input
                                            type="text"
                                            name="university"
                                            defaultValue={existingData.university || ''}
                                            placeholder="e.g., University of Oxford"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                                        />
                                    </div>
                                    <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <div className="flex items-stretch gap-0 border border-gray-200 rounded-xl overflow-hidden">
                                        {/* Hidden input carries the full number to the server */}
                                        <input type="hidden" name="phone" value={phoneDigits ? `${selectedCountry.dialCode}${phoneDigits}` : (existingData.phone || '')} />

                                        <div className="flex items-center gap-2 px-3">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`} alt={selectedCountry.name} width={20} height={14} className="rounded-[2px] object-cover" />
                                            <span className="font-mono text-base text-gray-700">{selectedCountry.dialCode}</span>
                                        </div>

                                        <input
                                            type="text"
                                            name="phone_display"
                                            value={formatLocalNumber(phoneDigits)}
                                            readOnly
                                            aria-readonly
                                            placeholder="7XXX XXXXXX"
                                            className="flex-1 px-4 py-3 bg-transparent text-gray-700 focus:outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Phone number set during onboarding and cannot be changed here.</p>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                Complete Profile
                                                <Check className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* Completion Banner */}
            {isAllCompleted && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-center text-white">
                    <h2 className="text-3xl font-bold mb-2">🎉 All Done!</h2>
                    <p className="text-white/90 mb-6">
                        You've completed all onboarding steps and are ready to start mentoring!
                    </p>
                    <a
                        href="/dashboard/mentor"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-600 font-bold rounded-xl hover:bg-green-50 transition-all"
                    >
                        Go to Dashboard
                        <ChevronRight className="w-5 h-5" />
                    </a>
                </div>
            )}
        </div>
    )
}

/** BackgroundUploadForm - client-side upload UI with simple progress, retry & cancel */
function BackgroundUploadForm({
    onSubmitHandler,
    backgroundCheckConfirmed,
    setBackgroundCheckConfirmed,
    isUploading,
    uploadError,
    uploadedFileUrl,
    uploadedFileName,
    lastSelectedFile,
    uploadProgress,
    onRetry,
    onCancel
}: {
    onSubmitHandler: (file: File | null, confirmed: boolean) => Promise<void>
    backgroundCheckConfirmed: boolean
    setBackgroundCheckConfirmed: (v: boolean) => void
    isUploading: boolean
    uploadError: string | null
    uploadedFileUrl: string | null
    uploadedFileName: string | null
    lastSelectedFile: File | null
    uploadProgress: number
    onRetry: () => void
    onCancel: () => void
}) {
    const [file, setFile] = useState<File | null>(lastSelectedFile ?? null)
    const [localError, setLocalError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalError(null)
        const f = e.target.files?.[0] ?? null
        if (f && f.size > 10 * 1024 * 1024) {
            setLocalError('File must be less than 10MB')
            e.target.value = ''
            setFile(null)
            return
        }
        setFile(f)
    }

    return (
        <div className="space-y-4">
            {/* Uploading */}
            {isUploading ? (
                <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        <div>
                            {/* If there is a file, show uploading progress. If user only submitted confirmation (no file),
                                show an indeterminate submitting state without the progress bar. */}
                            <p className="font-semibold text-gray-900">
                                {(file || lastSelectedFile) ? 'Uploading…' : 'Submitting confirmation…'}
                            </p>
                            <p className="text-sm text-gray-500">{file?.name ?? lastSelectedFile?.name ?? ''}</p>
                            {(file || lastSelectedFile) && (
                                <>
                                    <div className="w-48 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                        <div className="h-2 bg-accent transition-all" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-white border rounded-xl text-sm hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : uploadedFileUrl ? (
                // Success UI (file uploaded). The main step will show the completion panel (localStatus.dbs).
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-green-700">Upload complete</p>
                        <p className="text-sm text-green-600 mt-1 break-all">
                            File:{' '}
                            <a href={uploadedFileUrl} target="_blank" rel="noreferrer" className="underline">
                                {uploadedFileName ?? uploadedFileUrl}
                            </a>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onRetry} className="px-4 py-2 bg-white border rounded-xl text-sm hover:bg-gray-50">Retry upload</button>
                        <button onClick={() => setFile(null)} className="px-4 py-2 bg-white border rounded-xl text-sm hover:bg-gray-50">Remove file</button>
                    </div>
                </div>
            ) : (
                <>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault()
                            setLocalError(null)
                            if (!backgroundCheckConfirmed) {
                                setLocalError('Please confirm the background check statement.')
                                return
                            }
                            try {
                                await onSubmitHandler(file, backgroundCheckConfirmed)
                            } catch {
                                // Parent handler already sets the UI error state.
                            }
                        }}
                        className="space-y-4"
                    >
                        <label className="block">
                            <span className="text-sm font-medium text-gray-700">
                                Upload DBS certificate (PDF, JPG, PNG, max 10MB) - optional unless requested
                            </span>
                            <div className="mt-2 flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-500">
                                            <span className="font-semibold">Click to upload</span> or drag and drop.
                                        </p>
                                        {file && <p className="text-xs text-gray-500 mt-2 truncate">{file.name}</p>}
                                    </div>
                                    <input
                                        type="file"
                                        name="dbs_certificate"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="sr-only"
                                        onChange={handleFileChange}
                                    />
                                </label>
                                {localError && <p className="text-xs text-red-500 ml-4">{localError}</p>}
                            </div>
                        </label>

                        {uploadError && <p className="text-sm text-red-500">Upload failed — {uploadError}. Try again or cancel.</p>}

                        <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-accent/30 transition-colors cursor-pointer">
                            <input
                                type="checkbox"
                                name="background_check_confirm"
                                checked={backgroundCheckConfirmed}
                                onChange={(e) => setBackgroundCheckConfirmed(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
                                required
                            />
                            <span className="text-gray-700">
                                I confirm I have no criminal convictions or cautions that would make me unsuitable to work with students.
                            </span>
                        </label>

                        <div className="flex justify-end items-center gap-3">
                            <button
                                type="submit"
                                disabled={isUploading || !backgroundCheckConfirmed}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm & Continue
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    )
}
