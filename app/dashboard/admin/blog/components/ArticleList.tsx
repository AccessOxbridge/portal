import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Database } from '@/utils/supabase/types'
import { getBlogPostUrl } from '@/utils/blog'

type Article = Database['public']['Tables']['articles']['Row']

interface ArticleListProps {
    articles: Article[]
}

export function ArticleList({ articles }: ArticleListProps) {
    return (
        <div className="grid grid-cols-1 gap-6">
            {articles.map((article) => (
                <div key={article.id} className="group relative bg-card border border-border rounded-card p-6 hover:shadow-border transition-[background-color,box-shadow,color] duration-150">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                {article.categories?.map((cat) => (
                                    <span key={cat} className="px-2.5 py-1 bg-tint-blue text-brand rounded-lg text-xs font-semibold">
                                        {cat}
                                    </span>
                                ))}
                                {article.featured && (
                                    <span className="px-2.5 py-1 bg-tint-amber text-warning rounded-lg text-xs font-semibold">
                                        Featured
                                    </span>
                                )}
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-foreground group-hover:text-brand transition-colors cursor-pointer">
                                    {article.title}
                                </h3>
                                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                                    {article.description}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                                        {article.author?.[0] || 'A'}
                                    </div>
                                    <span className="font-medium text-muted-foreground">{article.author}</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{article.reading_time} min read</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex md:flex-col justify-end gap-2 shrink-0">
                            <Link
                                href={getBlogPostUrl(article.slug)}
                                target="_blank"
                                className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 border border-transparent bg-card text-foreground shadow-border hover:bg-muted h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                            >
                                View live
                            </Link>
                            <Link
                                href={`/dashboard/admin/blog/edit/${article.id}`}
                                className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                            >
                                Edit article
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
