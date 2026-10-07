'use client'

import {
    Children,
    Fragment,
    isValidElement,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type KeyboardEventHandler,
    type ReactNode,
} from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { CaretDown, CaretUp, Check } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { fieldBase } from '@/components/ui/input'

/* ── shadcn primitives, on the portal's tokens ───────────────────────────── */

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
    return (
        <SelectPrimitive.Trigger
            data-slot="select-trigger"
            className={cn(
                fieldBase,
                'flex h-11 items-center justify-between gap-2 px-3.5 text-start in-data-[density=compact]:h-9 in-data-[density=compact]:px-3',
                'data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1',
                className,
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <CaretDown className="size-4 shrink-0 text-muted-foreground" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    )
}

function SelectContent({ className, children, position = 'popper', ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                data-slot="select-content"
                position={position}
                className={cn(
                    'relative z-[1100] max-h-(--radix-select-content-available-height) min-w-32 overflow-x-hidden overflow-y-auto overscroll-contain',
                    'rounded-card border border-transparent bg-popover text-popover-foreground shadow-overlay',
                    'origin-(--radix-select-content-transform-origin)',
                    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-96 data-[state=open]:duration-150 data-[state=open]:ease-snappy',
                    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-96 data-[state=closed]:duration-100',
                    position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
                    className,
                )}
                {...props}
            >
                <SelectPrimitive.ScrollUpButton className="flex justify-center py-1 text-muted-foreground">
                    <CaretUp className="size-4" />
                </SelectPrimitive.ScrollUpButton>
                <SelectPrimitive.Viewport
                    className={cn(
                        'p-1',
                        position === 'popper' && 'w-full min-w-(--radix-select-trigger-width) scroll-my-1',
                    )}
                >
                    {children}
                </SelectPrimitive.Viewport>
                <SelectPrimitive.ScrollDownButton className="flex justify-center py-1 text-muted-foreground">
                    <CaretDown className="size-4" />
                </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    )
}

function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            data-slot="select-item"
            className={cn(
                'relative flex w-full cursor-default items-center rounded-[8px] py-2 ps-2.5 pe-8 text-base outline-none select-none',
                'in-data-[density=compact]:text-sm',
                'data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                className,
            )}
            {...props}
        >
            <span className="absolute end-2.5 flex size-4 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <Check weight="bold" className="size-4" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    )
}

/* ── SelectField: a drop-in for a native <select> ────────────────────────── */

type Option = { value: string; label: ReactNode; disabled: boolean }

/** Radix can't hold '' as an item value; "All ..." / "Select an option" use it. */
const EMPTY = '__empty__'
const toItem = (v: string) => (v === '' ? EMPTY : v)
const fromItem = (v: string) => (v === EMPTY ? '' : v)

function textOf(node: ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(textOf).join('')
    if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
    return ''
}

/** The <option> children, read the way a native select reads them. */
function readOptions(children: ReactNode): Option[] {
    const out: Option[] = []
    Children.forEach(children, (child) => {
        if (!isValidElement<{ children?: ReactNode; value?: unknown; disabled?: boolean }>(child)) return
        if (child.type === Fragment || child.type === 'optgroup') {
            out.push(...readOptions(child.props.children))
            return
        }
        if (child.type !== 'option') return
        const { value, children: label, disabled } = child.props
        // A native <option> with no value attribute submits its text.
        out.push({ value: value === undefined ? textOf(label) : String(value), label, disabled: !!disabled })
    })
    return out
}

/**
 * Same props and onChange as the native <select> it replaces (ported from the
 * CRM, where it replaced 40 selects with no behaviour change):
 *  - children are plain <option> elements (value-less options use their text);
 *  - a value matching no option shows the first enabled option, and that's
 *    what's submitted, as a browser does;
 *  - `name` submits through a hidden input (absent when disabled), so forms
 *    and FormData work as before;
 *  - '' is a real value ("All", "Select an option");
 *  - Escape closes only the menu, never a dialog or form around it.
 */
function SelectField({
    id,
    name,
    value,
    defaultValue,
    onChange,
    onKeyDown,
    disabled,
    className,
    'aria-label': ariaLabel,
    'aria-invalid': ariaInvalid,
    children,
}: {
    id?: string
    name?: string
    value?: string | number
    defaultValue?: string | number
    /** Called with a native-shaped event: only `target.value` and `target.name` are set. */
    onChange?: (e: ChangeEvent<HTMLSelectElement>) => void
    onKeyDown?: KeyboardEventHandler<HTMLButtonElement>
    disabled?: boolean
    className?: string
    'aria-label'?: string
    'aria-invalid'?: boolean
    children?: ReactNode
}) {
    const options = readOptions(children)
    const [inner, setInner] = useState(defaultValue === undefined ? undefined : String(defaultValue))
    const requested = value !== undefined ? String(value) : inner
    const current =
        requested !== undefined && options.some((o) => o.value === requested)
            ? requested
            : (options.find((o) => !o.disabled)?.value ?? '')

    function handleChange(next: string) {
        const real = fromItem(next)
        if (value === undefined) setInner(real)
        const target = { value: real, name: name ?? '' }
        onChange?.({ target, currentTarget: target } as unknown as ChangeEvent<HTMLSelectElement>)
    }

    return (
        <>
            <Select value={toItem(current)} onValueChange={handleChange} disabled={disabled}>
                <SelectTrigger id={id} aria-label={ariaLabel} aria-invalid={ariaInvalid} onKeyDown={onKeyDown} className={className}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent sideOffset={4} className="max-h-72" onEscapeKeyDown={(e) => e.stopPropagation()}>
                    {options.map((o, i) => (
                        <SelectItem key={`${i}:${o.value}`} value={toItem(o.value)} disabled={o.disabled}>
                            {o.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {name && !disabled && <input type="hidden" name={name} value={current} />}
        </>
    )
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectField }
