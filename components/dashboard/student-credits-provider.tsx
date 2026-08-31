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

interface StudentCreditsContextValue {
    credits: number
    openCreditsRequest: (reason?: CreditsRequestReason) => void
    tryOpenBookSession: () => void
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
}

export default function StudentCreditsProvider({
    children,
    initialCredits = 0,
    bookingProfile = null,
    canBook = false,
    mentors = [],
    rateableSession = null,
}: StudentCreditsProviderProps) {
    const [credits, setCredits] = useState(initialCredits)
    const [modalOpen, setModalOpen] = useState(false)
    const [modalReason, setModalReason] = useState<CreditsRequestReason>('topup')
    const [bookingOpen, setBookingOpen] = useState(false)
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

    const value = useMemo(
        () => ({ credits, openCreditsRequest, tryOpenBookSession }),
        [credits, openCreditsRequest, tryOpenBookSession]
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
            <RateSessionModal key={rateableSession?.id ?? 'none'} session={rateableSession} />
        </StudentCreditsContext.Provider>
    )
}
