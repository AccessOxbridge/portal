'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Props {
    initialCredits?: number
}

export default function CreditsFloatingButton({ initialCredits = 0 }: Props) {
    const [credits, setCredits] = useState(initialCredits)
    const [loading, setLoading] = useState(!initialCredits)
    const supabase = createClient()

    useEffect(() => {
        const fetchCredits = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    setCredits((profile as any).credits || 0)
                }
            }
            setLoading(false)
        }

        if (!initialCredits) {
            fetchCredits()
        }

        // Subscribe to realtime updates
        const channel = supabase
            .channel('credits-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    if ((payload.new as any).credits !== undefined) {
                        setCredits((payload.new as any).credits)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [initialCredits, supabase])

    if (loading) {
        return null
    }

    return (
        <Link
            href="/dashboard/student/credits"
            className="fixed top-5 right-16 z-50 flex items-center gap-3 px-4 py-2 rounded-lg 
            bg-accent text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/30"
        >
            <Clock className="w-4 h-4 text-white" />
            <p className="text-lg font-black leading-none">{credits}</p>
            <p className="text-[10px] font-medium text-white/80">
                {credits === 1 ? 'hour' : 'hours'} left
            </p>
        </Link>
    )
}
