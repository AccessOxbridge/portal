'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

export interface SelectMenuOption {
    value: string
    label: string
}

interface SelectMenuProps {
    value: string
    onChange: (value: string) => void
    options: SelectMenuOption[]
    placeholder?: string
    disabled?: boolean
    id?: string
    className?: string
    /** Max height of the open list in px */
    maxHeight?: number
}

const GAP = 6

export default function SelectMenu({
    value,
    onChange,
    options,
    placeholder = 'Select…',
    disabled = false,
    id,
    className = '',
    maxHeight = 200,
}: SelectMenuProps) {
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [position, setPosition] = useState<{
        top: number
        left: number
        width: number
        openUp: boolean
    } | null>(null)

    const rootRef = useRef<HTMLDivElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const selectedRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    const selected = options.find((o) => o.value === value)

    const updatePosition = () => {
        const trigger = rootRef.current
        if (!trigger) return
        const rect = trigger.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom - GAP
        const spaceAbove = rect.top - GAP
        const openUp = spaceBelow < maxHeight && spaceAbove > spaceBelow

        setPosition({
            top: openUp ? rect.top - GAP : rect.bottom + GAP,
            left: rect.left,
            width: rect.width,
            openUp,
        })
    }

    useLayoutEffect(() => {
        if (!open || disabled) {
            setPosition(null)
            return
        }
        updatePosition()
        // Scroll the selected option into view after paint
        requestAnimationFrame(() => {
            selectedRef.current?.scrollIntoView({ block: 'nearest' })
        })
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [open, disabled, maxHeight, options])

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

    const list = open && mounted && position && !disabled && (
        <div
            ref={popoverRef}
            role="listbox"
            style={{
                top: position.openUp ? undefined : position.top,
                bottom: position.openUp
                    ? window.innerHeight - position.top
                    : undefined,
                left: position.left,
                width: position.width,
                maxHeight,
            }}
            className="fixed z-[100] overflow-y-auto overscroll-contain bg-white rounded-xl border border-gray-100 shadow-xl py-1"
        >
            {options.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">No times available</p>
            ) : (
                options.map((option) => {
                    const isSelected = option.value === value
                    return (
                        <button
                            key={option.value}
                            ref={isSelected ? selectedRef : undefined}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                                onChange(option.value)
                                setOpen(false)
                            }}
                            className={[
                                'w-full text-left px-3 py-2 text-sm transition-colors',
                                isSelected
                                    ? 'bg-accent text-white font-medium'
                                    : 'text-gray-800 hover:bg-accent/10',
                            ].join(' ')}
                        >
                            {option.label}
                        </button>
                    )
                })
            )}
        </div>
    )

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => !disabled && setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={[
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm text-left',
                    disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'hover:border-gray-300',
                ].join(' ')}
            >
                <span className={selected ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {mounted && list ? createPortal(list, document.body) : null}
        </div>
    )
}
