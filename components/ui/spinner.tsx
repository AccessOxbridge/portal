import { CircleNotch } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'

/**
 * The one spinner. Turns once every 600ms: a faster spinner makes the same
 * wait feel shorter (emil-design-eng). Use inside buttons and small inline
 * areas; whole pages and lists get skeletons instead.
 */
export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
    return (
        <CircleNotch
            role="status"
            aria-label={label}
            weight="bold"
            className={cn('size-4 animate-spin [animation-duration:600ms] motion-reduce:[animation-duration:1.5s]', className)}
        />
    )
}
