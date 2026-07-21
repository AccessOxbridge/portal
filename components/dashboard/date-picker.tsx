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
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
    /** Selected date as YYYY-MM-DD */
    value: string
    onChange: (value: string) => void
    /** Earliest selectable date as YYYY-MM-DD (inclusive) */
    min?: string
    id?: string
    className?: string
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

export default function DatePicker({ value, onChange, min, id, className = '' }: DatePickerProps) {
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

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
        setPosition({
            top: rect.bottom + POPOVER_GAP,
            left,
        })
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
            className="fixed z-[100] bg-white rounded-2xl border border-gray-100 shadow-xl p-3"
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <button
                    type="button"
                    onClick={() => setViewMonth((m) => subMonths(m, 1))}
                    disabled={!canGoPrev}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    aria-label="Previous month"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-gray-900">
                    {format(viewMonth, 'MMMM yyyy')}
                </span>
                <button
                    type="button"
                    onClick={() => setViewMonth((m) => addMonths(m, 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                    aria-label="Next month"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                    <div
                        key={d}
                        className="h-8 flex items-center justify-center text-[11px] font-semibold text-gray-400"
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
                                'h-9 w-full rounded-lg text-sm font-medium transition-colors',
                                !inMonth && !isSelected ? 'text-gray-300' : '',
                                inMonth && !isSelected && !disabled ? 'text-gray-800 hover:bg-accent/10' : '',
                                disabled ? 'text-gray-200 cursor-not-allowed' : '',
                                isSelected ? 'bg-accent text-white hover:bg-accent' : '',
                                !isSelected && isToday && inMonth ? 'ring-1 ring-inset ring-accent/40' : '',
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
                type="button"
                id={id}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm text-left hover:border-gray-300"
            >
                <span className={selected ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {displayLabel}
                </span>
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            </button>

            {mounted && calendar ? createPortal(calendar, document.body) : null}
        </div>
    )
}
