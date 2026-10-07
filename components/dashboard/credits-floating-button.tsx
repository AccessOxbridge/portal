'use client'

import { Clock, Plus } from '@phosphor-icons/react/ssr'

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
            // Positioned by its parent's fixed cluster (StudentCreditsProvider),
            // beside the bell: same 44px height, white chip and ring.
            className="group flex h-11 items-center gap-2 rounded-full border border-transparent bg-card ps-1.5 pe-3 text-foreground shadow-border outline-none transition-[box-shadow,scale] duration-150 ease-out hover:shadow-border-hover active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 sm:pe-4"
        >
            <span className="grid size-8 place-items-center rounded-full bg-tint-green text-tint-green-foreground">
                <Clock weight="bold" className="size-4" />
            </span>
            <span className="flex items-baseline gap-1">
                <span className="text-base font-semibold tabular-nums">{credits}</span>
                <span className="text-sm text-muted-foreground">
                    {credits === 1 ? 'hour' : 'hours'}
                    {/* Phones keep it short so the pill fits beside the bell. */}
                    <span className="hidden sm:inline"> remaining</span>
                </span>
            </span>
            <span aria-hidden="true" className="ms-1 hidden h-5 w-px bg-border sm:block" />
            <Plus weight="bold" className="hidden size-4 text-brand transition-transform duration-150 ease-out group-hover:translate-x-0.5 sm:block" />
        </button>
    )
}
