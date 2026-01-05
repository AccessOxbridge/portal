import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Database } from '@/utils/supabase/types'

type Article = Database['public']['Tables']['articles']['Row']

interface ArticleListProps {
    articles: Article[]
}

function getHomePageURL() {
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000'
    }
    return process.env.NEXT_PUBLIC_HOME_PAGE_URL
}

export function ArticleList({ articles }: ArticleListProps) {
    return (
        <div className="grid grid-cols-1 gap-6">
            {articles.map((article) => (
                <div key={article.id} className="group relative bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                                    {article.category}
                                </span>
                                {article.featured && (
                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        Featured
                                    </span>
                                )}
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer">
                                    {article.title}
                                </h3>
                                <p className="text-gray-500 mt-2 line-clamp-2 text-sm leading-relaxed">
                                    {article.description}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase">
                                        {article.author?.[0] || 'A'}
                                    </div>
                                    <span className="font-medium text-gray-600">{article.author}</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{article.reading_time} min read</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex md:flex-col justify-end gap-2 shrink-0">
                            <Link
                                href={`${getHomePageURL()}/blog/${article.slug}`}
                                target="_blank"
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                            >
                                View Live
                            </Link>
                            <Link
                                href={`/dashboard/admin/blog/edit/${article.id}`}
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-accent rounded-xl hover:opacity-90 transition-all shadow-sm"
                            >
                                Edit Article
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
