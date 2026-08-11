'use client'

import { Clock, Plus } from 'lucide-react'

interface Props {
    credits: number
    onClick: () => void
}

export default function CreditsFloatingButton({ credits, onClick }: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`${credits} session hours remaining. Request more hours.`}
            data-floating-ui
            // right-[4.75rem] = 76px: the bell is 52px wide sitting at right-4
            // (16px), so this lands with a consistent 8px gap beside it at every
            // breakpoint. Matching height, radius, blur, border and shadow are
            // what make the pair read as one cluster.
            className="fixed top-5 right-[4.75rem] z-100 group flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2 rounded-2xl
            bg-white/70 backdrop-blur-md border border-white/40 transition-all duration-300 hover:scale-[1.02]
            active:scale-[0.98] shadow-2xl shadow-black/5 cursor-pointer"
        >
            <div className="flex items-center justify-center p-2 rounded-xl bg-accent text-white shadow-lg shadow-accent/20 transition-colors duration-300 group-hover:bg-accent/90">
                <Clock className="w-5 h-5" />
            </div>

            <div className="flex flex-col text-left">
                <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold tracking-tight text-gray-900">
                        {credits}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 text-gray-500">
                        {credits === 1 ? 'Hour' : 'Hours'}
                    </span>
                </div>
                {/* Supporting detail is dropped on phones so the pill doesn't
                    span half the viewport. */}
                <p className="hidden sm:block text-[9px] font-semibold tracking-wide text-gray-400 opacity-70 transition-opacity duration-300 group-hover:opacity-100">
                    REMAINING
                </p>
            </div>

            <div className="hidden sm:block h-8 w-px mx-1 bg-gray-200" />

            <div className="hidden sm:block p-1 rounded-full text-accent transition-transform group-hover:translate-x-1">
                <Plus className="w-4 h-4" />
            </div>
        </button>
    )
}
