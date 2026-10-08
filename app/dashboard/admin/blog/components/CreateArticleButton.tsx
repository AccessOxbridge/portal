import Link from 'next/link'

interface CreateArticleButtonProps {
    variant?: 'primary' | 'secondary'
}

export function CreateArticleButton({ variant = 'primary' }: CreateArticleButtonProps) {
    const buttonClasses = variant === 'primary'
        ? "px-8 py-4 rounded-card bg-primary text-white font-semibold hover:shadow-border hover:shadow-primary/40 transition-[background-color,box-shadow,color] duration-150 transform hover:-translate-y-1 inline-flex items-center gap-2"
        : "px-6 py-3 rounded-control bg-primary text-white font-semibold hover:shadow-border hover:shadow-primary/30 transition-[background-color,box-shadow,color] duration-150 inline-flex items-center gap-2"

    return (
        <Link href="/dashboard/admin/blog/create" className={buttonClasses}>
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create article
        </Link>
    )
}
