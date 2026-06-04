/**
 * Public blog post URL. Articles are stored in Supabase on the portal.
 * Use an external marketing site only when NEXT_PUBLIC_HOME_PAGE_URL differs from the app URL.
 */
export function getBlogPostUrl(slug: string): string {
    const home = process.env.NEXT_PUBLIC_HOME_PAGE_URL?.replace(/\/$/, '')
    const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')

    if (home && app && home !== app) {
        return `${home}/blog/${slug}`
    }

    return `/blog/${slug}`
}
