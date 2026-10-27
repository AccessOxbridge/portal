/**
 * Brand touches shared by every dashboard (student, mentor, parent, admin).
 *
 * The watermark is the Access Oxbridge logo, very large and see-through,
 * fixed behind the page content: cards sit on top of it, so its strokes only
 * show in the gaps around them. It is bigger than the screen and sits right of
 * centre, so the edges of the page crop it a little (as in the boss's sketch).
 *
 * - tone: 'navy' fills the logo shape with the brand navy; 'gold' uses the
 *   metallic logo (public/logo-gold.webp, from logo.png); 'off' hides it.
 * - size: the logo's diameter, as a CSS length.
 * - centre: where the middle of the logo sits, as a share of the content
 *   area's width and height (0.5 is the middle).
 */
export const WATERMARK = {
    tone: 'off' as 'navy' | 'gold' | 'off',
    opacity: { navy: 0.1, gold: 0.14 },
    size: 'min(115vh, 170vw)',
    centre: { x: 0.65, y: 0.7 },
}
