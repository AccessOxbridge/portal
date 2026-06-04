import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { ArticleMarkdown } from '@/components/blog/article-markdown'
import type { Metadata } from 'next'

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const supabase = await createClient()
    const { data: article } = await supabase
        .from('articles')
        .select('title, description')
        .eq('slug', slug)
        .maybeSingle()

    if (!article) return { title: 'Article not found' }

    return {
        title: `${article.title} | Access Oxbridge`,
        description: article.description,
    }
}

export default async function BlogArticlePage({ params }: PageProps) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: article } = await supabase
        .from('articles')
        .select('title, description, body, image, categories, reading_time, published_at')
        .eq('slug', slug)
        .maybeSingle()

    if (!article) notFound()

    const published = new Date(article.published_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
                <Link
                    href="/dashboard/student/resources"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-accent transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to resources
                </Link>

                <article>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {article.categories?.map((cat) => (
                            <span
                                key={cat}
                                className="px-2.5 py-0.5 bg-accent/10 text-accent rounded-lg text-xs font-bold uppercase tracking-wider"
                            >
                                {cat}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold text-accent tracking-tight leading-tight">
                        {article.title}
                    </h1>
                    <p className="mt-4 text-xl text-gray-500 font-medium leading-relaxed">{article.description}</p>

                    <div className="flex items-center gap-4 mt-6 text-sm text-gray-400">
                        <span>{published}</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {article.reading_time} min read
                        </span>
                    </div>

                    {article.image && (
                        <div className="mt-8 rounded-[24px] overflow-hidden border border-gray-100 shadow-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={article.image}
                                alt={article.title}
                                className="w-full aspect-[16/9] object-cover"
                            />
                        </div>
                    )}

                    <div className="mt-10 bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 md:p-12">
                        <ArticleMarkdown body={article.body} />
                    </div>
                </article>
            </div>
        </div>
    )
}
