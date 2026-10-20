import * as React from 'react'
import { Check } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'

/** A thin bar. Width changes ease over 300ms so a change reads as progress, not a jump. */
function ProgressBar({ value, max = 100, label, className }: { value: number; max?: number; label: string; className?: string }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100))
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={value}
            className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
        >
            <div
                className="h-full rounded-full bg-brand transition-[width] duration-300 ease-snappy motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
            />
        </div>
    )
}

/** A ring, for things like hours used. Put the number in `children` (tabular-nums). */
function ProgressRing({
    value,
    max = 100,
    size = 56,
    stroke = 6,
    label,
    tone = 'brand',
    className,
    children,
}: {
    value: number
    max?: number
    size?: number
    stroke?: number
    label: string
    tone?: 'brand' | 'success' | 'warning'
    className?: string
    children?: React.ReactNode
}) {
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const pct = Math.max(0, Math.min(1, value / max))
    const color = { brand: 'stroke-brand', success: 'stroke-success', warning: 'stroke-warning' }[tone]
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={value}
            className={cn('relative inline-grid place-items-center', className)}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - pct)}
                    className={cn(color, 'transition-[stroke-dashoffset] duration-500 ease-snappy motion-reduce:transition-none')}
                />
            </svg>
            {children && <div className="absolute inset-0 grid place-items-center text-center tabular-nums">{children}</div>}
        </div>
    )
}

type StepState = 'done' | 'current' | 'upcoming'

/**
 * Vertical steps. Done: a solid check. Current: a ring with a dot, in the
 * brand blue. Upcoming: a dashed circle (3.2:1 against white). Connectors are
 * dashed until the step before them is done.
 */
function Steps({ steps, className }: { steps: { label: React.ReactNode; hint?: React.ReactNode; state: StepState }[]; className?: string }) {
    return (
        <ol className={cn('flex flex-col', className)}>
            {steps.map((step, i) => {
                const last = i === steps.length - 1
                return (
                    <li key={i} className="relative flex gap-3 pb-5 last:pb-0" aria-current={step.state === 'current' ? 'step' : undefined}>
                        {!last && (
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'absolute start-3 top-7 bottom-1 -translate-x-1/2 border-s-2',
                                    step.state === 'done' ? 'border-solid border-success/40' : 'border-dashed border-input',
                                )}
                            />
                        )}
                        <StepMarker state={step.state} />
                        <div className="min-w-0 pt-0.5">
                            <p
                                className={cn(
                                    'text-base leading-snug in-data-[density=compact]:text-sm',
                                    step.state === 'current' && 'font-semibold text-foreground',
                                    step.state === 'done' && 'text-foreground',
                                    step.state === 'upcoming' && 'text-muted-foreground',
                                )}
                            >
                                {step.label}
                            </p>
                            {step.hint && <p className="mt-0.5 text-sm text-muted-foreground">{step.hint}</p>}
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}

function StepMarker({ state }: { state: StepState }) {
    if (state === 'done') {
        return (
            <span className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full bg-success text-white">
                <Check weight="bold" className="size-3.5" />
                <span className="sr-only">Done</span>
            </span>
        )
    }
    if (state === 'current') {
        return (
            <span className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full bg-card ring-2 ring-brand ring-inset">
                <span className="size-2.5 rounded-full bg-brand" />
                <span className="sr-only">Current step</span>
            </span>
        )
    }
    return (
        <span className="relative z-10 size-6 shrink-0 rounded-full border-2 border-dashed border-input bg-card">
            <span className="sr-only">Not started</span>
        </span>
    )
}

export { ProgressBar, ProgressRing, Steps, type StepState }
