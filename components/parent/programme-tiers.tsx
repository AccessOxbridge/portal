import { Check } from '@phosphor-icons/react/ssr'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/lib'
import type { Programme } from '@/lib/parent-programmes'

const gbp = (amount: number) => `£${amount.toLocaleString('en-GB')}`

export function ProgrammeTiers({ programmes }: { programmes: Programme[] }) {
    return (
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
            {programmes.map((programme) => (
                <article
                    key={programme.id}
                    className={cn(
                        'relative flex min-w-0 flex-col rounded-card border bg-card p-6 sm:p-7',
                        programme.recommended
                            ? 'border-gold bg-primary text-primary-foreground'
                            : 'border-border',
                    )}
                >
                    {programme.recommended && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-control bg-gold px-4 py-1.5 text-xs font-semibold tracking-[0.15em] text-primary">
                            Recommended
                        </span>
                    )}
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        {programme.name}
                    </h2>
                    <p
                        className={cn(
                            'mt-3 text-sm leading-relaxed lg:min-h-24',
                            programme.recommended
                                ? 'text-primary-foreground/75'
                                : 'text-muted-foreground',
                        )}
                    >
                        {programme.tagline}
                    </p>
                    <div className="mt-6">
                        <p className="flex flex-wrap items-baseline gap-1.5">
                            <span
                                className={cn(
                                    'text-4xl font-semibold tracking-tight tabular-nums xl:text-5xl',
                                    programme.recommended && 'text-gold',
                                )}
                            >
                                {gbp(programme.monthly)}
                            </span>
                            <span
                                className={cn(
                                    'text-sm',
                                    programme.recommended
                                        ? 'text-primary-foreground/75'
                                        : 'text-muted-foreground',
                                )}
                            >
                                /month
                            </span>
                        </p>
                        <p
                            className={cn(
                                'mt-2 text-xs',
                                programme.recommended
                                    ? 'text-primary-foreground/75'
                                    : 'text-muted-foreground',
                            )}
                        >
                            Billed monthly
                        </p>
                    </div>
                    <div
                        className={cn(
                            'mt-6 flex-1 border-t pt-5',
                            programme.recommended
                                ? 'border-primary-foreground/20'
                                : 'border-border',
                        )}
                    >
                        <p
                            className={cn(
                                'text-xs font-semibold uppercase tracking-[0.12em]',
                                programme.recommended
                                    ? 'text-gold'
                                    : 'text-gold-foreground',
                            )}
                        >
                            {programme.lead}
                        </p>
                        <ul className="mt-4 space-y-3">
                            {programme.features.map((feature) => (
                                <li
                                    key={feature}
                                    className="flex gap-2.5 text-sm leading-relaxed"
                                >
                                    <Check
                                        weight="bold"
                                        aria-hidden
                                        className={cn(
                                            'mt-1 size-4 shrink-0',
                                            programme.recommended
                                                ? 'text-gold'
                                                : 'text-gold-foreground',
                                        )}
                                    />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {programme.annual && (
                        <p className="mt-7 text-center text-sm leading-relaxed text-primary-foreground/80">
                            Annual membership also available:
                            <br />
                            <span className="font-semibold text-gold">
                                {gbp(programme.annual)} billed yearly
                            </span>
                        </p>
                    )}
                    {programme.footnote && (
                        <p className="mt-7 text-xs leading-relaxed text-muted-foreground">
                            {programme.footnote}
                        </p>
                    )}
                    <Button
                        disabled
                        variant={
                            programme.recommended ? 'secondary' : 'default'
                        }
                        className="mt-7 w-full"
                    >
                        Choose {programme.name.replace('Oxbridge ', '')}
                    </Button>
                    <p
                        className={cn(
                            'mt-2 text-center text-xs',
                            programme.recommended
                                ? 'text-primary-foreground/75'
                                : 'text-muted-foreground',
                        )}
                    >
                        Online enrolment opens soon
                    </p>
                </article>
            ))}
        </div>
    )
}
