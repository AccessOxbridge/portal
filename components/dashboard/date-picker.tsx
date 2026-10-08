'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isBefore,
    isSameDay,
    isSameMonth,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns'
import { CalendarBlank as Calendar, CaretLeft as ChevronLeft, CaretRight as ChevronRight } from '@phosphor-icons/react/ssr'

interface DatePickerProps {
    /** Selected date as YYYY-MM-DD */
    value: string
    onChange: (value: string) => void
    /** Earliest selectable date as YYYY-MM-DD (inclusive) */
    min?: string
    id?: string
    className?: string
    /**
     * Form use: the value is submitted under `name`, and `required` blocks an
     * empty submit with the browser's own message, as <input type="date"> did.
     */
    name?: string
    required?: boolean
}

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC midnight shift). */
function parseDateValue(value: string): Date {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
}

function toDateValue(d: Date): string {
    return format(d, 'yyyy-MM-dd')
}

const POPOVER_WIDTH = 280
const POPOVER_GAP = 6
/** Fallback height used on the first open, before the popover has been measured. */
const POPOVER_EST_HEIGHT = 340

export default function DatePicker({ value, onChange, min, id, className = '', name, required }: DatePickerProps) {
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)

    const selected = value ? parseDateValue(value) : null
    const minDate = min ? startOfDay(parseDateValue(min)) : null
    // Treat `min` as "today" when provided (callers pass timezone-aware today).
    const today = minDate ?? startOfDay(new Date())

    const [viewMonth, setViewMonth] = useState(() =>
        startOfMonth(selected ?? minDate ?? new Date())
    )

    useEffect(() => {
        setMounted(true)
    }, [])

    // Sync the visible month when the selected value changes externally
    useEffect(() => {
        if (selected) setViewMonth(startOfMonth(selected))
    }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

    const updatePosition = () => {
        const trigger = rootRef.current
        if (!trigger) return
        const rect = trigger.getBoundingClientRect()
        const left = Math.min(
            Math.max(8, rect.left),
            window.innerWidth - POPOVER_WIDTH - 8
        )

        // Flip above the trigger when there isn't room below — otherwise a
        // picker opened low in a scrolling modal renders off-screen on a phone.
        const height = popoverRef.current?.offsetHeight ?? POPOVER_EST_HEIGHT
        const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP
        const spaceAbove = rect.top - POPOVER_GAP
        const flipUp = spaceBelow < height && spaceAbove > spaceBelow

        const top = flipUp
            ? Math.max(8, rect.top - POPOVER_GAP - height)
            : Math.min(rect.bottom + POPOVER_GAP, window.innerHeight - height - 8)

        setPosition({ top: Math.max(8, top), left })
    }

    useLayoutEffect(() => {
        if (!open) {
            setPosition(null)
            return
        }
        updatePosition()
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [open])

    useEffect(() => {
        if (!open) return

        const onPointerDown = (e: MouseEvent) => {
            const target = e.target as Node
            if (rootRef.current?.contains(target)) return
            if (popoverRef.current?.contains(target)) return
            setOpen(false)
        }
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }

        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 })
        const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 })
        return eachDayOfInterval({ start, end })
    }, [viewMonth])

    const displayLabel = selected
        ? format(selected, 'EEE, d MMM')
        : 'Select a date'

    const canGoPrev = !minDate || !isBefore(endOfMonth(subMonths(viewMonth, 1)), minDate)

    const pickDay = (day: Date) => {
        if (minDate && isBefore(startOfDay(day), minDate)) return
        onChange(toDateValue(day))
        setOpen(false)
    }

    const calendar = open && mounted && position && (
        <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose a date"
            style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
            className="fixed z-[1100] rounded-card border border-transparent bg-popover p-3 text-popover-foreground shadow-overlay animate-in fade-in-0 zoom-in-96 duration-150 ease-snappy motion-reduce:animate-none"
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <button
                    type="button"
                    onClick={() => setViewMonth((m) => subMonths(m, 1))}
                    disabled={!canGoPrev}
                    className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Previous month"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-foreground">
                    {format(viewMonth, 'MMMM yyyy')}
                </span>
                <button
                    type="button"
                    onClick={() => setViewMonth((m) => addMonths(m, 1))}
                    className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Next month"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                    <div
                        key={d}
                        className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
                    >
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {days.map((day) => {
                    const dayStart = startOfDay(day)
                    const disabled = !!minDate && isBefore(dayStart, minDate)
                    const inMonth = isSameMonth(day, viewMonth)
                    const isSelected = !!selected && isSameDay(day, selected)
                    const isToday = isSameDay(day, today)

                    return (
                        <button
                            key={toDateValue(day)}
                            type="button"
                            disabled={disabled}
                            onClick={() => pickDay(day)}
                            className={[
                                'h-11 sm:h-9 w-full rounded-full text-sm font-medium tabular-nums transition-colors',
                                !inMonth && !isSelected ? 'text-muted-foreground/50' : '',
                                inMonth && !isSelected && !disabled ? 'text-foreground hover:bg-muted' : '',
                                disabled ? 'text-muted-foreground/30 cursor-not-allowed' : '',
                                isSelected ? 'bg-primary text-primary-foreground hover:bg-primary' : '',
                                !isSelected && isToday && inMonth ? 'text-brand ring-1 ring-inset ring-brand/40' : '',
                            ].filter(Boolean).join(' ')}
                        >
                            {format(day, 'd')}
                        </button>
                    )
                })}
            </div>
        </div>
    )

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                id={id}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className="flex h-11 w-full items-center justify-between gap-2 rounded-control border border-input bg-card px-3.5 text-left text-base outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25"
            >
                <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
                    {displayLabel}
                </span>
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
            </button>

            {/* Carries the value into a <form> and the browser's required check.
                It sits invisibly over the trigger so the "please fill in" bubble
                points at the picker; focusing it hands focus to the trigger. */}
            {(name || required) && (
                <input
                    tabIndex={-1}
                    aria-hidden="true"
                    name={name}
                    required={required}
                    value={value}
                    onChange={() => {}}
                    onFocus={() => triggerRef.current?.focus()}
                    className="pointer-events-none absolute inset-0 size-full opacity-0"
                />
            )}

            {mounted && calendar ? createPortal(calendar, document.body) : null}
        </div>
    )
}
