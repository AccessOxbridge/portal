import Image from 'next/image'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { cn } from '@/utils/lib'

const TONES = {
    brand: 'bg-tint-blue text-tint-blue-foreground',
    success: 'bg-tint-green text-tint-green-foreground',
    warning: 'bg-tint-amber text-tint-amber-foreground',
    danger: 'bg-tint-rose text-tint-rose-foreground',
}

/**
 * The frame for the small sign-in pages (forgot and reset password, verify
 * email, errors): the logo, then one centred card. Layout only; each page
 * keeps its own form, links and logic.
 */
export function AuthCard({
    icon: Icon,
    tone = 'brand',
    title,
    description,
    children,
    footer,
}: {
    icon?: PhosphorIcon
    tone?: keyof typeof TONES
    title: React.ReactNode
    description?: React.ReactNode
    children?: React.ReactNode
    footer?: React.ReactNode
}) {
    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex items-center justify-center gap-2.5">
                    <span className="grid size-11 place-items-center rounded-full bg-primary">
                        <Image src="/logo.png" alt="" width={32} height={32} className="[mix-blend-mode:screen]" />
                    </span>
                    <span className="text-xl font-extrabold tracking-tight text-primary">Access Oxbridge</span>
                </div>

                <div className="rounded-sheet border border-transparent bg-card p-6 shadow-border sm:p-8">
                    {Icon && (
                        <span className={cn('mb-5 grid size-12 place-items-center rounded-full', TONES[tone])}>
                            <Icon weight="duotone" className="size-6" />
                        </span>
                    )}
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">{title}</h1>
                    {description && <p className="mt-2 text-muted-foreground text-pretty">{description}</p>}
                    {children && <div className="mt-6">{children}</div>}
                </div>

                {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
            </div>
        </div>
    )
}

/** A message inside an AuthCard: amber for notices, rose for errors, green for done. */
export function AuthNotice({ tone = 'warning', title, children }: { tone?: 'warning' | 'danger' | 'success'; title?: string; children: React.ReactNode }) {
    return (
        <div
            role={tone === 'danger' ? 'alert' : 'status'}
            className={cn(
                'rounded-control px-4 py-3 text-sm ring-1',
                tone === 'danger' && 'bg-tint-rose text-tint-rose-foreground ring-destructive/20',
                tone === 'warning' && 'bg-tint-amber text-tint-amber-foreground ring-warning/30',
                tone === 'success' && 'bg-tint-green text-tint-green-foreground ring-success/25',
            )}
        >
            {title && <p className="font-semibold">{title}</p>}
            <p className={cn(title && 'mt-0.5', 'text-pretty')}>{children}</p>
        </div>
    )
}
