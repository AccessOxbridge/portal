'use client'

import { ArrowSquareOut } from '@phosphor-icons/react/ssr'

export function StripeDashboardButton() {
    const handleClick = async () => {
        const res = await fetch('/api/stripe/connect/dashboard')
        if (res.ok) {
            const { url } = await res.json()
            window.open(url, '_blank')
        }
    }

    return (
        <button
            onClick={handleClick}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-base font-medium whitespace-nowrap text-[#635BFF] transition-[background-color,scale] duration-150 ease-out hover:bg-white/90 active:scale-[0.96]"
        >
            Open dashboard
            <ArrowSquareOut weight="bold" className="size-4" />
        </button>
    )
} 
