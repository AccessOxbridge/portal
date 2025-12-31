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
        <div className="space-y-12">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-5xl font-extrabold text-accent tracking-tight">Blog Management</h1>
                    <p className="mt-4 text-gray-500 text-xl font-medium">Create and manage blog articles for the platform.</p>
                </div>
                <CreateArticleButton />
            </header>

            <div className="bg-white shadow-xl shadow-gray-200/50 rounded-[40px] border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">All Articles</h2>
                        <span className="bg-rich-beige-accent text-accent px-4 py-2 rounded-xl text-sm font-bold">
                            {articles?.length || 0} Articles
                        </span>
                    </div>
                </div>

                <div className="p-8">
                    {!articles || articles.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">No articles yet</h3>
                            <p className="text-gray-500 mb-6">Start creating engaging content for your audience.</p>
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
