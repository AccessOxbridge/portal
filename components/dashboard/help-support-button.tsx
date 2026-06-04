'use client'

import Link from 'next/link'
import { LifeBuoy } from 'lucide-react'

export default function HelpSupportButton() {
    return (
        <Link
            href="/dashboard/student/messages?support=1"
            aria-label="Help & Support"
            className="fixed bottom-6 right-6 z-100 group flex items-center gap-2 px-5 py-3 rounded-2xl
            bg-accent text-white shadow-2xl shadow-accent/30 transition-all duration-300
            hover:scale-[1.03] active:scale-[0.97]"
        >
            <LifeBuoy className="w-5 h-5" />
            <span className="font-bold text-sm hidden sm:inline">Help & Support</span>
        </Link>
    )
}
