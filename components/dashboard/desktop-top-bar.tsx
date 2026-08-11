/**
 * Slim app bar for desktop, hidden below `md`.
 *
 * Its job is to give the persistent chrome a home. `NotificationBell` and
 * `CreditsFloatingButton` are `position: fixed` at `top-5` and mounted far
 * apart — the bell in the root layout, the credits pill inside
 * StudentCreditsProvider — so rather than re-plumbing both, this reserves a
 * band of real layout height for them to land in. That is the same trick
 * `MobileTopBar` already uses.
 *
 * Sized h-20 (80px) deliberately: the bell is 60px tall at top-5, so its
 * bottom edge sits at exactly 80px. The credits pill ends at 72px.
 *
 * Before this existed the chrome floated over page content, which is why the
 * messages page needed its own header band purely to dodge them, and why the
 * image viewer had to hide them via [data-floating-ui].
 *
 * The left side is intentionally empty for now — it is the natural home for a
 * page title, breadcrumb or search later.
 */
export default function DesktopTopBar() {
    return (
        <header
            aria-hidden
            className="hidden md:block sticky top-0 z-30 h-20 shrink-0 bg-white border-b border-gray-200/70"
        />
    )
}
