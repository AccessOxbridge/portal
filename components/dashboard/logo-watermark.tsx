import { cn } from '@/utils/lib'
import { WATERMARK } from '@/config/brand.config'

/**
 * The big see-through logo behind every dashboard page. Fixed to the viewport
 * (it stays put while the page scrolls), offset by the sidebar from md up, and
 * never clickable. Decorative only, so hidden from screen readers.
 */
export function LogoWatermark({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
    if (WATERMARK.tone === 'off') return null
    const gold = WATERMARK.tone === 'gold'
    return (
        <div
            aria-hidden
            className={cn(
                'pointer-events-none fixed inset-y-0 right-0 left-0 -z-10 grid place-items-center overflow-hidden',
                sidebarCollapsed ? 'md:left-[4.5rem]' : 'md:left-64'
            )}
        >
            <div
                className={cn('aspect-square w-[min(80vw,70vh)] max-w-[44rem]', !gold && 'bg-primary')}
                style={
                    gold
                        ? {
                              backgroundImage: 'url(/logo-gold.webp)',
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              opacity: WATERMARK.opacity.gold,
                          }
                        : {
                              maskImage: 'url(/logo.webp)',
                              WebkitMaskImage: 'url(/logo.webp)',
                              maskSize: 'contain',
                              WebkitMaskSize: 'contain',
                              maskRepeat: 'no-repeat',
                              WebkitMaskRepeat: 'no-repeat',
                              maskPosition: 'center',
                              WebkitMaskPosition: 'center',
                              opacity: WATERMARK.opacity.navy,
                          }
                }
            />
        </div>
    )
}
