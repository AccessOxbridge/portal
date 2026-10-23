import { cn } from '@/utils/lib'
import { WATERMARK } from '@/config/brand.config'

/**
 * The big see-through logo behind every dashboard page. Fixed to the viewport
 * (it stays put while the page scrolls), offset by the sidebar from md up, and
 * never clickable. Larger than the screen, so the edges crop it. Decorative
 * only, so hidden from screen readers.
 */
export function LogoWatermark({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
    if (WATERMARK.tone === 'off') return null
    const gold = WATERMARK.tone === 'gold'
    const shape = gold
        ? {
              backgroundImage: 'url(/logo-gold.webp)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              opacity: WATERMARK.opacity.gold,
          }
        : {
              maskImage: 'url(/logo.webp)',
              WebkitMaskImage: 'url(/logo.webp)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              opacity: WATERMARK.opacity.navy,
          }
    return (
        <div
            aria-hidden
            className={cn(
                'pointer-events-none fixed inset-y-0 right-0 left-0 -z-10 overflow-hidden',
                sidebarCollapsed ? 'md:left-[4.5rem]' : 'md:left-64'
            )}
        >
            <div
                className={cn('absolute aspect-square -translate-x-1/2 -translate-y-1/2', !gold && 'bg-primary')}
                style={{
                    width: WATERMARK.size,
                    left: `${WATERMARK.centre.x * 100}%`,
                    top: `${WATERMARK.centre.y * 100}%`,
                    ...shape,
                }}
            />
        </div>
    )
}
