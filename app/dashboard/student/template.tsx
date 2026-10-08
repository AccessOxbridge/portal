/**
 * A short fade as each page arrives (opacity only, 200ms). No fill mode, so
 * once it ends nothing is left on the wrapper: no stacking context that
 * could trap a popup under the sidebar. h-full keeps full-height pages
 * (mentor onboarding) sized as before. Admin has no template on purpose:
 * pages used all day shouldn't animate on every click.
 */
export default function Template({ children }: { children: React.ReactNode }) {
    return <div className="h-full animate-in fade-in-0 duration-200 ease-out motion-reduce:animate-none">{children}</div>
}
