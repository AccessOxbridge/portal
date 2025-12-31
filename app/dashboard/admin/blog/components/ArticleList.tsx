import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Database } from '@/utils/supabase/types'

type Article = Database['public']['Tables']['articles']['Row']

interface ArticleListProps {
    articles: Article[]
}

export function ArticleList({ articles }: ArticleListProps) {
    return (
        <div className="space-y-4">
            {articles.map((article) => (
                <div key={article.id} className="border border-gray-100 rounded-2xl p-6 hover:bg-gray-50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-accent transition-colors">
                                    {article.title}
                                </h3>
                                {article.featured && (
                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                                        Featured
                                    </span>
                                )}
                            </div>

                            <p className="text-gray-600 mb-3 line-clamp-2">
                                {article.description}
                            </p>

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {article.author}
                                </span>

                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {article.reading_time} min read
                                </span>

                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    {article.category}
                                </span>

                                <span className="text-gray-400">
                                    {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                                </span>
                            </div>

                            {article.tags && article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {article.tags.slice(0, 3).map((tag) => (
                                        <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs">
                                            {tag}
                                        </span>
                                    ))}
                                    {article.tags.length > 3 && (
                                        <span className="text-gray-400 text-xs">
                                            +{article.tags.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 ml-4">
                            <Link
                                href={`/blog/${article.slug}`}
                                target="_blank"
                                className="px-4 py-2 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
                            >
                                View
                            </Link>
                            <Link
                                href={`/dashboard/admin/blog/edit/${article.id}`}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Edit
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
