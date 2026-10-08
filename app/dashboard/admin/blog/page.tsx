import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreateArticleButton } from './components/CreateArticleButton'
import { ArticleList } from './components/ArticleList'

export default async function AdminBlogPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) return redirect('/dashboard')

    // Fetch all articles
    const { data: articles } = await supabase
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false })

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Blog management</h1>
                    <p className="text-muted-foreground mt-1">Create and manage content for the Oxford-Bridge network.</p>
                </div>
                <CreateArticleButton />
            </header>

            <div className="border border-transparent bg-card rounded-card overflow-hidden shadow-border">
                <div className="p-8 border-b border-border bg-muted/60">
                    <div className="flex justify-center items-center">
                        <h2 className="text-lg font-semibold text-foreground">All articles</h2>
                        <span className="bg-card border border-border text-muted-foreground px-3 py-1 rounded-lg text-sm font-semibold">
                            {articles?.length || 0} Articles
                        </span>
                    </div>
                </div>

                <div className="p-8">
                    {!articles || articles.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="size-20 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="size-10 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No articles yet</h3>
                            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">Start creating engaging content for your audience to see it listed here.</p>
                            <CreateArticleButton variant="secondary" />
                        </div>
                    ) : (
                        <ArticleList articles={articles} />
                    )}
                </div>
            </div>
        </div>
    )
}
