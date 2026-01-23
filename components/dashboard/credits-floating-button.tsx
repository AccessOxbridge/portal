'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, Plus } from 'lucide-react'
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
            href="/dashboard/student/services"
            className="fixed top-5 right-20 md:right-24 z-100 group flex items-center gap-4 px-5 py-2 rounded-2xl 
            bg-white/70 backdrop-blur-md border border-white/40 transition-all duration-300 hover:scale-[1.02] 
            active:scale-[0.98] shadow-2xl shadow-black/5"
        >
            <div className="flex items-center justify-center p-2 rounded-xl bg-accent text-white shadow-lg shadow-accent/20 transition-colors duration-300 group-hover:bg-accent/90">
                <Clock className="w-5 h-5" />
            </div>

            <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold tracking-tight text-gray-900">
                        {credits}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 text-gray-500">
                        {credits === 1 ? 'Hour' : 'Hours'}
                    </span>
                </div>
                <p className="text-[9px] font-semibold tracking-wide text-gray-400 opacity-70 transition-opacity duration-300 group-hover:opacity-100">
                    REMAINING
                </p>
            </div>

            <div className="h-8 w-px mx-1 bg-gray-200" />

            <div className="p-1 rounded-full text-accent transition-transform group-hover:translate-x-1">
                <Plus className="w-4 h-4" />
            </div>
        </Link>
    )
}
