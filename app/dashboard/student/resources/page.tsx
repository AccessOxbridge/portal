import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Clock, ArrowLeft, CaretRight as ChevronRight } from '@phosphor-icons/react/ssr'
import { getBlogPostUrl } from '@/utils/blog'

const CATEGORY_MAP: Record<string, string> = {
    'oxbridge-admissions': 'Oxbridge Admissions',
    'personal-statement': 'Personal Statement',
    'interview-tips': 'Interview Tips',
    'uk-universities': 'UK Universities',
    'student-stories': 'Student Stories',
}

const CATEGORY_LABELS: Record<string, { label: string; description: string; emoji: string }> = {
    'oxbridge-admissions': {
        label: 'Oxbridge Strategy',
        description: 'Admissions guides, college selection tips, and application strategy.',
        emoji: '🎓',
    },
    'personal-statement': {
        label: 'Personal Statement Guide',
        description: 'Write a compelling personal statement that stands out.',
        emoji: '✍️',
    },
    'interview-tips': {
        label: 'Interview Mastery',
        description: 'Prepare for Oxbridge interviews with expert advice and practice questions.',
        emoji: '🎤',
    },
    'uk-universities': {
        label: 'Subject Deep Dives',
        description: 'In-depth guides on specific subjects and what universities look for.',
        emoji: '🔬',
    },
    'student-stories': {
        label: 'Student Stories',
        description: 'Real experiences from students who got into Oxford and Cambridge.',
        emoji: '📖',
    },
}

interface PageProps {
    searchParams: Promise<{ category?: string }>
}

export default async function StudentResourcesPage({ searchParams }: PageProps) {
    const supabase = await createClient()
    const { category: categorySlug } = await searchParams

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    const dbCategory = categorySlug ? CATEGORY_MAP[categorySlug] : null

    let query = supabase
        .from('articles')
        .select('id, slug, title, description, published_at, reading_time, categories, featured, image')
        .order('published_at', { ascending: false })

    if (dbCategory) {
        query = query.contains('categories', [dbCategory])
    }

    const { data: articles } = await query

    const activeLabel = categorySlug ? CATEGORY_LABELS[categorySlug] : null

    return (
        <div className="space-y-10 max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-6 flex flex-col gap-2">
                {categorySlug ? (
                    <>
                        <Link
                            href="/dashboard/student/resources"
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand transition-colors mb-2 w-fit"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            All Resources
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-card bg-tint-blue flex items-center justify-center text-2xl">
                                {activeLabel?.emoji ?? '📚'}
                            </div>
                            <div>
                                <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                                    {activeLabel?.label ?? categorySlug}
                                </h1>
                                {activeLabel?.description && (
                                    <p className="mt-1 text-muted-foreground font-medium">{activeLabel.description}</p>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">Learning Resources</h1>
                        <p className="mt-2 text-muted-foreground text-xl font-medium">
                            Expert guides to help you get into Oxford or Cambridge.
                        </p>
                    </>
                )}
            </header>

            {/* Category grid (shown when no category selected) */}
            {!categorySlug && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Object.entries(CATEGORY_LABELS).map(([slug, { label, description, emoji }]) => (
                        <Link
                            key={slug}
                            href={`/dashboard/student/resources?category=${slug}`}
                            className="p-6 bg-card rounded-card border border-border shadow-border hover:shadow-border-hover transition-[background-color,box-shadow,color] duration-150 group flex flex-col gap-3"
                        >
                            <div className="w-12 h-12 rounded-card bg-tint-blue flex items-center justify-center text-xl">
                                {emoji}
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground group-hover:text-brand transition-colors">{label}</h2>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
                            </div>
                            <div className="flex items-center gap-1 text-brand text-sm font-semibold mt-auto">
                                Browse articles <ChevronRight className="w-4 h-4" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Category filter tabs (shown when a category is active) */}
            {categorySlug && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_LABELS).map(([slug, { label }]) => (
                        <Link
                            key={slug}
                            href={`/dashboard/student/resources?category=${slug}`}
                            className={`px-4 py-2 rounded-control text-sm font-semibold transition-[background-color,box-shadow,color] duration-150 ${
 slug === categorySlug
 ? 'bg-primary text-white shadow-border'
 : 'bg-muted text-muted-foreground hover:bg-muted'
 }`}
                        >
                            {label}
                        </Link>
                    ))}
                </div>
            )}

            {/* Articles list */}
            {(categorySlug || (!categorySlug && articles && articles.length > 0)) && (
                <div className="space-y-4">
                    {!categorySlug && (
                        <h2 className="text-2xl font-semibold text-foreground">All Articles</h2>
                    )}
                    {!articles || articles.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-4 bg-card rounded-card border border-border">
                            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-muted-foreground/60" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">No articles yet</h3>
                            <p className="text-muted-foreground text-sm">Check back soon. More content is on its way.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5">
                            {articles.map((article) => (
                                <ArticleCard key={article.id} article={article} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function ArticleCard({ article }: { article: any }) {
    const articleURL = getBlogPostUrl(article.slug)

    return (
        <Link
            href={articleURL}
            className="group flex flex-col sm:flex-row gap-5 p-6 bg-card rounded-card border border-border shadow-border hover:shadow-border-hover transition-[background-color,box-shadow,color] duration-150"
        >
            {article.image && (
                <div className="shrink-0 w-full sm:w-36 h-28 rounded-card overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
            )}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex flex-wrap gap-2">
                    {article.categories?.map((cat: string) => (
                        <span key={cat} className="px-2.5 py-0.5 bg-tint-blue text-brand rounded-lg text-xs font-semibold uppercase tracking-wider">
                            {cat}
                        </span>
                    ))}
                    {article.featured && (
                        <span className="px-2.5 py-0.5 bg-tint-amber text-warning rounded-lg text-xs font-semibold uppercase tracking-wider">
                            Featured
                        </span>
                    )}
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-brand transition-colors leading-snug">
                    {article.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{article.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-1">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{article.reading_time} min read</span>
                    </div>
                    <span className="ml-auto flex items-center gap-1 text-brand font-semibold">
                        Read <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                </div>
            </div>
        </Link>
    )
}
