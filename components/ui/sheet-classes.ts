/**
 * The Dialog's look, as plain classes, for the few popups that can't sit on
 * Radix Dialog: the booking, reschedule and mentor-request popups host the
 * DatePicker and SelectMenu, whose menus render at document.body. Inside a
 * Radix modal a click on those menus counts as "outside" and would close the
 * popup, so these keep their own shell and borrow this look instead.
 *
 * The DatePicker and SelectMenu menus sit at z-1100, above these sheets.
 *
 * Bottom sheet on phones, centred card from `sm` up, same radius, shadow,
 * padding and entrance as components/ui/dialog.tsx.
 */
export const sheet = {
    // z-1000: above the floating bell / hours / help chips (z-100 to z-999).
    root: 'fixed inset-0 z-[1000] flex items-end justify-center sm:items-center',
    overlay: 'absolute inset-0 bg-black/40 animate-in fade-in-0 duration-200 motion-reduce:animate-none',
    panel: [
        'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-card text-card-foreground shadow-overlay',
        'rounded-t-sheet pb-[env(safe-area-inset-bottom)] sm:mx-4 sm:max-h-[min(90dvh,48rem)] sm:rounded-sheet sm:pb-0',
        'animate-in slide-in-from-bottom duration-300 ease-drawer motion-reduce:animate-none',
        'sm:slide-in-from-bottom-0 sm:fade-in-0 sm:zoom-in-96 sm:duration-200 sm:ease-snappy',
    ].join(' '),
    handle: 'flex shrink-0 justify-center pt-2.5 pb-1 sm:hidden',
    handleBar: 'h-1.5 w-10 rounded-full bg-border',
    header: 'flex shrink-0 items-start justify-between gap-3 px-6 pt-3 pb-4 sm:pt-6',
    title: 'text-lg font-semibold leading-snug text-foreground text-balance',
    description: 'mt-1 text-sm text-muted-foreground text-pretty',
    close: 'grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-[background-color,color,scale] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40',
    body: 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-5',
    footer: 'flex shrink-0 flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end',
    label: 'mb-1.5 block text-sm font-medium text-foreground',
}
