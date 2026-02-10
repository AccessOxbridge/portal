'use client'

import { createClient } from '@/utils/supabase/client'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogoutButton({ className = "" }: { className?: string }) {
    const supabase = createClient()
    const router = useRouter()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    return (
        <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${className || 'text-gray-500 hover:text-gray-900'}`}
        >
            <LogOut className="w-4 h-4" />
            Sign Out
        </button>
    )
}
