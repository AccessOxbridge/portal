import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ArticleForm } from '../../components/ArticleForm'

interface EditArticlePageProps {
    params: Promise<{ id: string }>
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
    const { id } = await params
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

    // Fetch the article to edit
    const { data: article } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single()

    if (!article) {
        return redirect('/dashboard/admin/blog')
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">Edit Article</h1>
                <p className="mt-2 text-gray-500 text-lg">Update the article "{article.title}".</p>
            </header>

            <div className="bg-white shadow-xl shadow-gray-200/50 rounded-[40px] border border-gray-100 overflow-hidden">
                <div className="p-8">
                    <ArticleForm author={profile.full_name || 'Unknown Author'} article={article} />
                </div>
            </div>
        </div>
    )
}
