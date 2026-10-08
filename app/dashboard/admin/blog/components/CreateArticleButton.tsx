import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utils/lib'

interface CreateArticleButtonProps {
    variant?: 'primary' | 'secondary'
}

export function CreateArticleButton({ variant = 'primary' }: CreateArticleButtonProps) {
    const buttonClasses = cn(buttonVariants({ variant: variant === 'primary' ? 'default' : 'secondary' }))

    return (
        <Link href="/dashboard/admin/blog/create" className={buttonClasses}>
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create article
        </Link>
    )
}
