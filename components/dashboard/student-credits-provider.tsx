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

const OPEN_BOOK_ALLOWED = 'open-book-session-allowed'

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
}

export default function StudentCreditsProvider({
    children,
    initialCredits = 0,
}: StudentCreditsProviderProps) {
    const [credits, setCredits] = useState(initialCredits)
    const [modalOpen, setModalOpen] = useState(false)
    const [modalReason, setModalReason] = useState<CreditsRequestReason>('topup')
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
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(OPEN_BOOK_ALLOWED))
        }
    }, [credits, openCreditsRequest])

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
        </StudentCreditsContext.Provider>
    )
}

export { OPEN_BOOK_ALLOWED }
