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
            className="fixed top-5 right-20 md:right-24 z-100 group flex items-center gap-4 px-5 py-2 rounded-2xl 
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
                <p className="text-[9px] font-semibold tracking-wide text-gray-400 opacity-70 transition-opacity duration-300 group-hover:opacity-100">
                    REMAINING
                </p>
            </div>

            <div className="h-8 w-px mx-1 bg-gray-200" />

            <div className="p-1 rounded-full text-accent transition-transform group-hover:translate-x-1">
                <Plus className="w-4 h-4" />
            </div>
        </button>
    )
}
