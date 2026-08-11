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
    Download,
    ClipboardList,
    AlertCircle
} from 'lucide-react'
import { completeQuestionnaire, signContract, submitBackgroundCheck, completeProfile } from './actions'
import { StripeOnboardingButton } from '@/components/dashboard/stripe-onboarding-button'
import { COUNTRIES } from '@/config/countries'
import { PHOTO_ACCEPT_ATTR } from '@/lib/image-upload'

interface OnboardingStatus {
    questionnaire: boolean
    contract: boolean
    dbs: boolean
    payment: boolean
    profile: boolean
}

interface QuestionnaireAnswers {
    q_oxbridge_college: string
    q_specialisation: string
    q_alevels: string
    q_approach: string
}

interface ExistingData {
    photo_url?: string | null
    bio?: string | null
    expertise?: string[] | null
    university?: string | null
    phone?: string | null
    email?: string | null
    stripeConnected: boolean
    payoutsEnabled: boolean
    contractSignature?: string | null
    contractSignedAt?: string | null
    dbsCertificateUrl?: string | null
    questionnaire?: QuestionnaireAnswers | null
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
    { id: 'questionnaire', title: 'Questionnaire', icon: ClipboardList },
    { id: 'contract', title: 'Contract', icon: FileText },
    { id: 'dbs', title: 'Background Checks', icon: Shield },
    { id: 'payment', title: 'Payment', icon: CreditCard },
    { id: 'profile', title: 'Profile', icon: User },
]

// Index of the last step (Profile). Used to clamp the initial step.
const LAST_STEP_INDEX = STEPS.length - 1

// Onboarding questionnaire — free-text questions that replaced the old Training + Quiz steps.
const QUESTIONNAIRE: { id: keyof QuestionnaireAnswers; question: string; placeholder: string }[] = [
    {
        id: 'q_oxbridge_college',
        question: 'Did you attend Oxford or Cambridge, which college, and what did you study?',
        placeholder: 'e.g. Cambridge, Trinity College, Natural Sciences',
    },
    {
        id: 'q_specialisation',
        question: 'What area of your subject do you specialise in or feel most passionate about?',
        placeholder: 'Tell us what you love most within your subject...',
    },
    {
        id: 'q_alevels',
        question: 'What A-levels (or equivalent) did you take, and what grades did you achieve?',
        placeholder: 'e.g. Maths (A*), Physics (A*), Chemistry (A)',
    },
    {
        id: 'q_approach',
        question: 'How would you describe your approach to working with students?',
        placeholder: 'Describe your mentoring style and what students can expect...',
    },
]

// Mentor Agreement, stored as structured data so the on-screen contract and the
// downloadable copy are rendered from a single source of truth (no drift).
const AGREEMENT_INTRO = 'This Agreement is between Access Oxbridge and the Mentor named below.'

type AgreementSection = { title: string; body?: string; bullets?: string[] }

const AGREEMENT_SECTIONS: AgreementSection[] = [
    {
        title: '1. Background',
        body: 'Access Oxbridge is a specialist admissions organisation that prepares students worldwide to gain entry to the University of Oxford and the University of Cambridge, achieving a 67% offer rate — more than four times the global average. The Mentor has relevant academic expertise to provide high-quality, personalised guidance to students in pursuit of this goal. This Agreement sets out the terms of that engagement.',
    },
    {
        title: '2. Mentor Services',
        body: 'The Mentor agrees to provide the following services as directed by Access Oxbridge:',
        bullets: [
            'Conducting one-to-one mentoring sessions with assigned students, delivered remotely via video call or any format agreed with Access Oxbridge.',
            'Providing guidance on personal statements, subject knowledge, interview technique, and the Oxford and Cambridge application process.',
            "Delivering constructive, honest, and supportive feedback tailored to each student's individual needs and target subject.",
            'Attending any required onboarding, training, or briefing sessions organised by Access Oxbridge.',
            'Maintaining accurate session records and submitting notes or reports as reasonably requested.',
            "Promptly communicating any concerns regarding a student's wellbeing or progress to Access Oxbridge.",
        ],
    },
    {
        title: '3. Nature of Engagement',
        body: 'The Mentor is engaged as an independent contractor. Nothing in this Agreement creates or implies an employment relationship, partnership, or agency. The Mentor is solely responsible for their own tax, National Insurance contributions, and any other statutory obligations arising from fees received.',
    },
    {
        title: '4. Fees & Payment',
        bullets: [
            'Session Rate: As agreed in writing prior to commencement. Rates may vary by session type.',
            'Payment Schedule: Monthly, within 14 days of receipt of a valid invoice from the Mentor.',
            'Expenses: Not payable unless agreed in advance and in writing by Access Oxbridge.',
        ],
    },
    {
        title: '5. Availability & Scheduling',
        bullets: [
            'The Mentor will provide Access Oxbridge with reasonable advance notice of their availability each programme cycle.',
            'Cancellations must be notified as soon as practicable and, except in genuine emergencies, no less than 24 hours before a scheduled session.',
            "Access Oxbridge will endeavour to match students to Mentors in a way that respects the Mentor's declared availability.",
        ],
    },
    {
        title: '6. Standards & Conduct',
        body: 'The Mentor agrees to uphold the following standards at all times:',
        bullets: [
            'Deliver sessions to a consistently high professional standard, with accurate and current subject knowledge.',
            'Treat all students with respect, fairness, and sensitivity regardless of background, culture, or academic level.',
            'Maintain appropriate professional boundaries with students at all times.',
            "Comply with Access Oxbridge's safeguarding standards and promptly report any concerns to the designated lead.",
            'Not accept private paid tutoring arrangements with students introduced through Access Oxbridge for 12 months following the end of this Agreement.',
        ],
    },
    {
        title: '7. Safeguarding',
        body: 'Access Oxbridge is committed to the safety and wellbeing of all students. The Mentor agrees to:',
        bullets: [
            'Complete an enhanced DBS check (or equivalent) if required by Access Oxbridge prior to working with students.',
            'Complete any safeguarding training required by Access Oxbridge.',
            "Adhere to Access Oxbridge's safeguarding standards and expectations for the duration of this Agreement.",
            "Report any safeguarding concern immediately to Access Oxbridge's designated safeguarding lead.",
        ],
    },
    {
        title: '8. Confidentiality',
        body: "The Mentor will keep confidential all information relating to Access Oxbridge's business, students, pricing, and materials. This obligation applies during and after the term of this Agreement and does not prevent disclosure required by law or of information already in the public domain through no fault of the Mentor.",
    },
    {
        title: '9. Data Protection',
        body: 'Both parties will comply with all applicable data protection legislation, including the UK GDPR and the Data Protection Act 2018. The Mentor will process student personal data only as necessary to deliver the agreed services, will not share or use that data outside this Agreement, and will notify Access Oxbridge immediately upon becoming aware of any actual or suspected personal data breach.',
    },
    {
        title: '10. Intellectual Property',
        body: 'Any materials or content created by the Mentor specifically for Access Oxbridge in the course of providing services under this Agreement shall be the sole property of Access Oxbridge. All intellectual property rights are assigned to Access Oxbridge upon creation. The Mentor retains ownership of any pre-existing materials they bring to the engagement.',
    },
    {
        title: '11. Term & Termination',
        body: 'This Agreement commences on the date of signing and continues until terminated as follows:',
        bullets: [
            "Either party may terminate by giving 14 days' written notice to the other.",
            'Access Oxbridge may terminate with immediate effect in the event of serious breach, misconduct, or a safeguarding concern.',
            'On termination, the Mentor will promptly return Access Oxbridge materials and cease using any Confidential Information.',
            'Clauses 8, 9, 10, and 12 survive termination of this Agreement.',
        ],
    },
    {
        title: '12. Non-Solicitation',
        body: 'For 12 months following termination, the Mentor agrees not to solicit, approach, or accept paid private tutoring from any student introduced through Access Oxbridge, nor encourage any student to reduce or end their engagement with Access Oxbridge.',
    },
    {
        title: '13. Liability',
        body: "Access Oxbridge's total liability under this Agreement shall not exceed the total fees paid to the Mentor in the three months preceding the event giving rise to the claim. Nothing in this Agreement excludes liability for fraud, death, or personal injury caused by negligence.",
    },
    {
        title: '14. General',
        bullets: [
            'Entire Agreement: This Agreement supersedes all prior discussions and constitutes the entire agreement between the parties on its subject matter.',
            'Amendments: Any amendment must be agreed in writing and signed by both parties.',
            'Governing Law: This Agreement is governed by the laws of England and Wales. Disputes are subject to the exclusive jurisdiction of the courts of England and Wales.',
            'Severability: If any provision is found unenforceable, the remaining provisions continue in full force.',
        ],
    },
]

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Builds a self-contained, print-ready HTML document of the signed agreement.
// Rendered from the same AGREEMENT_SECTIONS as the on-screen contract so the two never drift.
function buildContractHtml(details: {
    fullName: string
    email: string
    institution: string
    signature: string
    signedDate: string
}): string {
    const dateStr = details.signedDate
        ? new Date(details.signedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : ''

    const sectionsHtml = AGREEMENT_SECTIONS.map((s) => {
        const body = s.body ? `<p>${escapeHtml(s.body)}</p>` : ''
        const bullets = s.bullets ? `<ul>${s.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''
        return `<section><h2>${escapeHtml(s.title)}</h2>${body}${bullets}</section>`
    }).join('')

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Access Oxbridge — Mentor Agreement</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1f2937; line-height: 1.55; max-width: 760px; margin: 32px auto; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: .04em; }
  h2 { font-size: 14px; margin: 18px 0 4px; }
  p, li { font-size: 12.5px; }
  ul { margin: 4px 0 0; padding-left: 20px; }
  li { margin-bottom: 3px; }
  .intro { font-size: 12.5px; color: #4b5563; }
  .parties { display: flex; gap: 20px; margin: 16px 0; }
  .party { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
  .party h3 { font-size: 12px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  .party .label { color: #6b7280; }
  .sigs { display: flex; gap: 40px; margin-top: 28px; }
  .sig { flex: 1; }
  .sig .name { font-family: 'Segoe Script', 'Brush Script MT', cursive; font-size: 22px; border-bottom: 1px solid #9ca3af; padding-bottom: 2px; min-height: 30px; }
  .sig .meta { font-size: 11.5px; color: #4b5563; margin-top: 6px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
  @media print { body { margin: 0 auto; } }
</style>
</head>
<body>
  <h1>MENTOR AGREEMENT</h1>
  <p class="intro">${escapeHtml(AGREEMENT_INTRO)}</p>
  <div class="parties">
    <div class="party">
      <h3>The Company</h3>
      <p>Access Oxbridge<br/>accessoxbridge.io</p>
    </div>
    <div class="party">
      <h3>The Mentor</h3>
      <p>
        <span class="label">Full Name:</span> ${escapeHtml(details.fullName || '—')}<br/>
        <span class="label">Email:</span> ${escapeHtml(details.email || '—')}<br/>
        <span class="label">Institution:</span> ${escapeHtml(details.institution || '—')}
      </p>
    </div>
  </div>
  ${sectionsHtml}
  <h2>Signatures</h2>
  <p>By signing below, both parties confirm they have read and agree to be bound by the terms of this Mentor Agreement.</p>
  <div class="sigs">
    <div class="sig">
      <div class="name">Access Oxbridge</div>
      <div class="meta">For Access Oxbridge<br/>Date: ${escapeHtml(dateStr)}</div>
    </div>
    <div class="sig">
      <div class="name">${escapeHtml(details.signature || details.fullName || '')}</div>
      <div class="meta">Mentor — ${escapeHtml(details.fullName || '')}<br/>Date: ${escapeHtml(dateStr)}</div>
    </div>
  </div>
  <div class="footer">Please retain a signed copy for your records.&nbsp;&nbsp;|&nbsp;&nbsp;accessoxbridge.io</div>
</body>
</html>`
}

export default function TrainingContent({
    mentorId,
    mentorName,
    onboardingStatus,
    initialStep = 0,
    existingData
}: TrainingContentProps) {
    const [currentStep, setCurrentStep] = useState(Math.max(0, Math.min(initialStep, LAST_STEP_INDEX)))
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    // Form states
    const [signature, setSignature] = useState(existingData.contractSignature || '')
    const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswers>({
        q_oxbridge_college: existingData.questionnaire?.q_oxbridge_college || '',
        q_specialisation: existingData.questionnaire?.q_specialisation || '',
        q_alevels: existingData.questionnaire?.q_alevels || '',
        q_approach: existingData.questionnaire?.q_approach || '',
    })
    const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(onboardingStatus.questionnaire)
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

    const handleSubmitQuestionnaire = () => {
        setError(null)

        // Check if all questions are answered
        if (QUESTIONNAIRE.some(q => !questionnaireAnswers[q.id]?.trim())) {
            setError('Please answer all questions before submitting')
            return
        }

        startTransition(async () => {
            const result = await completeQuestionnaire(questionnaireAnswers)
            if (result.error) {
                setError(result.error)
            } else {
                setQuestionnaireSubmitted(true)
                setLocalStatus(prev => ({ ...prev, questionnaire: true }))
                setCurrentStep(2) // Move to contract
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
                setCurrentStep(3) // Move to Background Checks
            }
        })
    }

    const handleDownloadContract = () => {
        const html = buildContractHtml({
            fullName: mentorName || '',
            email: existingData.email || '',
            institution: existingData.university || '',
            signature: existingData.contractSignature || signature || mentorName || '',
            signedDate: existingData.contractSignedAt || new Date().toISOString(),
        })

        // Render into a hidden iframe and trigger the print dialog (Save as PDF),
        // which avoids popup blockers that can break window.open.
        const iframe = document.createElement('iframe')
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
        document.body.appendChild(iframe)

        const cleanup = () => setTimeout(() => { try { document.body.removeChild(iframe) } catch { /* already removed */ } }, 1000)

        iframe.onload = () => {
            try {
                iframe.contentWindow?.focus()
                iframe.contentWindow?.print()
            } finally {
                cleanup()
            }
        }

        const doc = iframe.contentWindow?.document
        if (!doc) {
            document.body.removeChild(iframe)
            return
        }
        doc.open()
        doc.write(html)
        doc.close()
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
                <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">
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
                                We require all of our team members to complete this short onboarding.
                            </p>
                            <p className="text-accent font-semibold">
                                As soon as these few steps are done, you can start receiving allocations immediately!
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

                {/* Step 1: Questionnaire */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
                                <ClipboardList className="w-7 h-7 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Getting to Know You</h2>
                                <p className="text-gray-500">A few questions to help us build your profile</p>
                            </div>
                        </div>

                        {questionnaireSubmitted ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-green-700 font-semibold">Questionnaire Completed!</p>
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                >
                                    Continue to Contract
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    {QUESTIONNAIRE.map((q, index) => (
                                        <div key={q.id} className="bg-gray-50 rounded-2xl p-6">
                                            <label htmlFor={q.id} className="block font-semibold text-gray-900 mb-3">
                                                {index + 1}. {q.question}
                                            </label>
                                            <textarea
                                                id={q.id}
                                                rows={3}
                                                value={questionnaireAnswers[q.id]}
                                                onChange={(e) => setQuestionnaireAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                placeholder={q.placeholder}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none bg-white"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSubmitQuestionnaire}
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
                                                Submit Questionnaire
                                                <ChevronRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 2: Contract */}
                {currentStep === 2 && (
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
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                                    <button
                                        onClick={handleDownloadContract}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-green-300 text-green-700 font-bold rounded-xl hover:bg-green-50 transition-all"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download signed contract
                                    </button>
                                    <button
                                        onClick={() => setCurrentStep(3)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                    >
                                        Continue to Background Checks
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Full mentor agreement */}
                                <div className="bg-gray-50 rounded-2xl p-6 max-h-96 overflow-y-auto border border-gray-200">
                                    <h3 className="font-bold text-gray-900 text-lg">MENTOR AGREEMENT</h3>
                                    <p className="text-sm text-gray-600 mt-1">{AGREEMENT_INTRO}</p>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                                            <p className="font-semibold text-gray-900 mb-1">The Company</p>
                                            <p className="text-gray-700">Access Oxbridge</p>
                                            <p className="text-gray-500">accessoxbridge.io</p>
                                        </div>
                                        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
                                            <p className="font-semibold text-gray-900 mb-1">The Mentor</p>
                                            <p className="text-gray-700">
                                                <span className="text-gray-500">Full Name: </span>
                                                {mentorName || '—'}
                                            </p>
                                            <p className="text-gray-700">
                                                <span className="text-gray-500">Email: </span>
                                                {existingData.email || '—'}
                                            </p>
                                            <p className="text-gray-700">
                                                <span className="text-gray-500">Institution: </span>
                                                {existingData.university || '—'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-4 text-sm text-gray-600 leading-relaxed">
                                        {AGREEMENT_SECTIONS.map((section) => (
                                            <div key={section.title}>
                                                <p className="font-semibold text-gray-900">{section.title}</p>
                                                {section.body && <p>{section.body}</p>}
                                                {section.bullets && (
                                                    <ul className="list-disc pl-5 mt-1 space-y-1">
                                                        {section.bullets.map((bullet, i) => (
                                                            <li key={i}>{bullet}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
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
                                        By typing your name above, you confirm you have read and agree to be bound by the terms of this Mentor Agreement. Your signature and the date will be recorded.
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

                {/* Step 3: Background Checks */}
                {currentStep === 3 && (
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
                                    onClick={() => setCurrentStep(4)}
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

                {/* Step 4: Payment Setup */}
                {currentStep === 4 && (
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
                                    onClick={() => setCurrentStep(5)}
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
                                        onClick={() => setCurrentStep(5)}
                                        className="text-gray-500 text-sm hover:text-gray-700 underline"
                                    >
                                        Skip for now (you can set this up later)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 5: Profile Completion */}
                {currentStep === 5 && (
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
                                            accept={PHOTO_ACCEPT_ATTR}
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
