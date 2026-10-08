import { cn } from '@/utils/lib'

/**
 * Pill tabs for pages that switch views with their own state (sessions,
 * mentors, reports): a muted track, the active tab lifted onto a white chip.
 * Same look as components/ui/tabs.tsx, as classes for existing buttons.
 */
export const segmentTrack = 'no-scrollbar flex w-full max-w-full gap-1 overflow-x-auto rounded-full bg-muted p-1 sm:w-fit'

export const segmentClass = (active: boolean) => cn(
    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm sm:gap-2 sm:px-4 font-medium outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/40',
    active ? 'bg-card text-foreground shadow-border' : 'text-muted-foreground hover:text-foreground',
)

export const segmentCount = 'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums'
