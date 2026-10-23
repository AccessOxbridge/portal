/**
 * Brand touches shared by every dashboard (student, mentor, parent, admin).
 *
 * The watermark is the Access Oxbridge logo, large and see-through, fixed
 * behind the page content: cards sit on top of it, so it only shows in the
 * space around them. 'gold' uses the metallic logo (public/logo-gold.webp, from logo.png); 'navy' fills the same
 * shape with the brand navy. Opacity is per tone because the gold logo is
 * much lighter than the navy.
 */
export const WATERMARK = {
    tone: 'gold' as 'gold' | 'navy' | 'off',
    opacity: { gold: 0.14, navy: 0.045 },
}
