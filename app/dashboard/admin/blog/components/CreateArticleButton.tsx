import Link from 'next/link'

interface CreateArticleButtonProps {
    variant?: 'primary' | 'secondary'
}

export function CreateArticleButton({ variant = 'primary' }: CreateArticleButtonProps) {
    const buttonClasses = variant === 'primary'
        ? "px-8 py-4 rounded-2xl bg-accent text-white font-bold hover:shadow-2xl hover:shadow-accent/40 transition-all transform hover:-translate-y-1 inline-flex items-center gap-2"
        : "px-6 py-3 rounded-xl bg-accent text-white font-bold hover:shadow-lg hover:shadow-accent/30 transition-all inline-flex items-center gap-2"

    return (
        <Link href="/dashboard/admin/blog/create" className={buttonClasses}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Article
        </Link>
    )
}
