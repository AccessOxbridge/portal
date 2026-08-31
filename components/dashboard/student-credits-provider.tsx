'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import { createClient } from '@/utils/supabase/client'
import CreditsRequestModal, { type CreditsRequestReason } from '@/components/dashboard/credits-request-modal'
import CreditsFloatingButton from '@/components/dashboard/credits-floating-button'
import BookSessionModal, { type StudentBookingProfile } from '@/components/dashboard/book-session-modal'
import RateSessionModal, { type RateableSession } from '@/components/dashboard/rate-session-modal'
import MilestoneModal, { type StudentMilestone } from '@/components/dashboard/milestone-modal'
import SatisfactionSurveyModal from '@/components/dashboard/satisfaction-survey-modal'
import type { DueSatisfactionSurvey } from '@/lib/student-satisfaction'

interface StudentCreditsContextValue {
    credits: number
    openCreditsRequest: (reason?: CreditsRequestReason) => void
    tryOpenBookSession: () => void
    /**
     * Whether the every-4-sessions check-in is still outstanding. Starts from
     * the server-selected value and flips to false the moment the survey is
     * submitted, so the banner retires without a router refresh.
     */
    satisfactionSurveyDue: boolean
    openSatisfactionSurvey: () => void
}

const StudentCreditsContext = createContext<StudentCreditsContextValue | null>(null)

export function useStudentCredits() {
    const ctx = useContext(StudentCreditsContext)
    if (!ctx) {
        throw new Error('useStudentCredits must be used within StudentCreditsProvider')
    }
    return ctx
}

export function useStudentCreditsOptional() {
    return useContext(StudentCreditsContext)
}

interface StudentCreditsProviderProps {
    children: ReactNode
    initialCredits?: number
    /**
     * The student's academic profile, supplied only when booking is currently
     * possible (profile complete + an admin-assigned mentor). When null, the
     * sidebar CTA falls back to the credits flow but the booking modal can't open.
     */
    bookingProfile?: StudentBookingProfile | null
    canBook?: boolean
    /** The student's currently assigned mentors, for the booking modal's mentor picker. */
    mentors?: { id: string; name: string }[]
    /**
     * A recently completed session this student hasn't rated or dismissed, if
     * any. Selected server-side so the popup can appear on any dashboard page.
     */
    rateableSession?: RateableSession | null
    /**
     * A session-count milestone this student has just reached and not yet been
     * congratulated for, if any. Selected server-side alongside the feedback
     * prompt so the celebration can fire on any dashboard page.
     */
    milestone?: StudentMilestone | null
    /**
     * The every-4-sessions satisfaction check-in this student owes, if any.
     * Selected server-side so the banner shows on any dashboard page.
     */
    satisfactionSurvey?: DueSatisfactionSurvey | null
}

export default function StudentCreditsProvider({
    children,
    initialCredits = 0,
    bookingProfile = null,
    canBook = false,
    mentors = [],
    rateableSession = null,
    milestone = null,
    satisfactionSurvey = null,
}: StudentCreditsProviderProps) {
    const [credits, setCredits] = useState(initialCredits)
    const [modalOpen, setModalOpen] = useState(false)
    const [modalReason, setModalReason] = useState<CreditsRequestReason>('topup')
    const [bookingOpen, setBookingOpen] = useState(false)
    // The milestone celebration queues behind the feedback popup: two modals on
    // the same load would bury the confetti under a form. With no feedback
    // popup to wait for, it is free to fire immediately.
    const [feedbackClosed, setFeedbackClosed] = useState(!rateableSession)
    // The check-in never opens by itself — the banner opens it. Unlike the two
    // popups above it is not an interruption, so it waits to be asked for.
    const [satisfactionOpen, setSatisfactionOpen] = useState(false)
    const [satisfactionDone, setSatisfactionDone] = useState(false)
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        setCredits(initialCredits)
    }, [initialCredits])

    useEffect(() => {
        const channel = supabase
            .channel('student-credits-provider')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    const next = (payload.new as { credits?: number }).credits
                    if (next !== undefined) setCredits(next)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    const openCreditsRequest = useCallback((reason: CreditsRequestReason = 'topup') => {
        setModalReason(reason)
        setModalOpen(true)
    }, [])

    const tryOpenBookSession = useCallback(() => {
        if (credits <= 0) {
            openCreditsRequest('booking')
            return
        }
        // Profile incomplete or no mentor assigned yet — nothing to open. The
        // in-page CTAs that show in those states route the student elsewhere.
        if (canBook && bookingProfile) {
            setBookingOpen(true)
        }
    }, [credits, canBook, bookingProfile, openCreditsRequest])

    // The sidebar "Book a session" button dispatches this event; listening here
    // (in a provider mounted on every dashboard page) is what makes the CTA work
    // everywhere the sidebar is visible.
    useEffect(() => {
        if (typeof window === 'undefined') return
        const handler = () => tryOpenBookSession()
        window.addEventListener('open-book-session', handler)
        return () => window.removeEventListener('open-book-session', handler)
    }, [tryOpenBookSession])

    const openSatisfactionSurvey = useCallback(() => setSatisfactionOpen(true), [])

    const satisfactionSurveyDue = !!satisfactionSurvey && !satisfactionDone

    const value = useMemo(
        () => ({
            credits,
            openCreditsRequest,
            tryOpenBookSession,
            satisfactionSurveyDue,
            openSatisfactionSurvey,
        }),
        [
            credits,
            openCreditsRequest,
            tryOpenBookSession,
            satisfactionSurveyDue,
            openSatisfactionSurvey,
        ]
    )

    return (
        <StudentCreditsContext.Provider value={value}>
            {children}
            <CreditsFloatingButton credits={credits} onClick={() => openCreditsRequest('topup')} />
            <CreditsRequestModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                reason={modalReason}
                credits={credits}
            />
            {bookingProfile && canBook && (
                <BookSessionModal
                    isOpen={bookingOpen}
                    onClose={() => setBookingOpen(false)}
                    studentProfile={bookingProfile}
                    mentors={mentors}
                />
            )}
            <RateSessionModal
                key={rateableSession?.id ?? 'none'}
                session={rateableSession}
                onClosed={() => setFeedbackClosed(true)}
            />
            <MilestoneModal
                key={milestone?.milestone ?? 'no-milestone'}
                milestone={milestone}
                ready={feedbackClosed}
            />
            <SatisfactionSurveyModal
                isOpen={satisfactionOpen}
                onClose={() => setSatisfactionOpen(false)}
                survey={satisfactionSurvey}
                onSubmitted={() => setSatisfactionDone(true)}
            />
        </StudentCreditsContext.Provider>
    )
}
