import Link from 'next/link'
import { ArrowLeft, ArrowSquareOut, CheckCircle, Lightbulb } from '@phosphor-icons/react/ssr'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { readingMinutes, type GuideBlock, type ParentGuide } from '@/lib/parent-resources'

/**
 * One parent guide as a portal page: the PDF's content in the portal's own
 * type and surfaces, so it reflows on a phone and there is nothing to
 * download. The navy header echoes the guide's printed cover.
 */
export function ParentGuideArticle({ guide }: { guide: ParentGuide }) {
    return (
        <article className="mx-auto max-w-3xl pb-16">
            <Link
                href="/dashboard/parent/resources"
                className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
                <ArrowLeft className="size-4" />
                Resources
            </Link>

            <header className="mt-4 rounded-card bg-primary px-6 py-8 text-primary-foreground sm:px-10 sm:py-10">
                <p className="text-xs font-semibold tracking-wider text-primary-foreground/70 uppercase">{guide.eyebrow}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{guide.title}</h1>
                <p className="mt-3 max-w-xl text-base text-pretty text-primary-foreground/80 sm:text-lg">{guide.subtitle}</p>
                <p className="mt-6 text-sm text-primary-foreground/60">{readingMinutes(guide)} min read</p>
            </header>

            <div className="mt-8 space-y-6">
                {groupTerms(guide.blocks).map((block, i) => (
                    <Block key={i} block={block} />
                ))}
            </div>

            <p className="mt-12 border-t border-border pt-4 text-sm text-muted-foreground">
                Always check the latest details on the official university websites.
            </p>
        </article>
    )
}

type TermBlock = Extract<GuideBlock, { type: 'term' }>
type Grouped = Exclude<GuideBlock, TermBlock> | { type: 'terms'; items: TermBlock[] }

/** Consecutive terms render as one list with dividers. */
function groupTerms(blocks: GuideBlock[]): Grouped[] {
    const out: Grouped[] = []
    for (const b of blocks) {
        const last = out[out.length - 1]
        if (b.type === 'term') {
            if (last?.type === 'terms') last.items.push(b)
            else out.push({ type: 'terms', items: [b] })
        } else {
            out.push(b)
        }
    }
    return out
}

function Eyebrow({ children }: { children: React.ReactNode }) {
    return <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{children}</p>
}

function Block({ block }: { block: Grouped }) {
    switch (block.type) {
        case 'lead':
            return <p className="text-lg leading-relaxed text-pretty text-foreground">{block.text}</p>
        case 'p':
            return <p className="leading-relaxed text-pretty text-foreground/90">{block.text}</p>
        case 'section':
            return (
                <div className="pt-6">
                    <Eyebrow>{block.label}</Eyebrow>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-balance">{block.title}</h2>
                    <div className="mt-3 h-0.5 w-10 rounded-full bg-brand" />
                </div>
            )
        case 'h3':
            return <h3 className="pt-2 text-lg font-semibold text-balance">{block.text}</h3>
        case 'terms':
            return (
                <dl className="divide-y divide-border">
                    {block.items.map((t) => (
                        <div key={t.term} className="py-4 first:pt-0 last:pb-0">
                            <dt className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                                {t.term}
                                {t.tag && <Badge tone={t.tag === 'Oxford' ? 'blue' : 'green'}>{t.tag}</Badge>}
                            </dt>
                            <dd className="mt-1 leading-relaxed text-pretty text-muted-foreground">{t.text}</dd>
                        </div>
                    ))}
                </dl>
            )
        case 'table':
            return (
                <Card className="p-5 sm:p-6">
                    <Eyebrow>{block.label}</Eyebrow>
                    <p className="mt-1 text-pretty text-foreground/90">{block.intro}</p>
                    {/* Phones: one stacked row per meaning, so nothing scrolls sideways. */}
                    <dl className="mt-4 divide-y divide-border sm:hidden">
                        {block.rows.map((row) => (
                            <div key={row[0]} className="py-3 first:pt-0 last:pb-0">
                                <dt className="text-sm text-muted-foreground">{row[0]}</dt>
                                {row.slice(1).map((cell, i) => (
                                    <dd key={i} className="mt-1 flex gap-2 text-sm">
                                        <span className="w-20 shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            {block.columns[i + 1]}
                                        </span>
                                        <span className="font-medium text-foreground">{cell}</span>
                                    </dd>
                                ))}
                            </div>
                        ))}
                    </dl>
                    <div className="mt-4 hidden sm:block">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs tracking-wider text-muted-foreground uppercase">
                                    {block.columns.map((c) => (
                                        <th key={c} scope="col" className="py-2 pr-4 font-semibold last:pr-0">
                                            {c}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {block.rows.map((row) => (
                                    <tr key={row[0]}>
                                        {row.map((cell, i) =>
                                            i === 0 ? (
                                                <th key={i} scope="row" className="py-2.5 pr-4 font-normal text-muted-foreground">
                                                    {cell}
                                                </th>
                                            ) : (
                                                <td key={i} className="py-2.5 pr-4 font-medium text-foreground last:pr-0">
                                                    {cell}
                                                </td>
                                            )
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )
        case 'stats':
            return (
                <Card className="p-5 sm:p-6">
                    <Eyebrow>{block.label}</Eyebrow>
                    <dl className="mt-4 grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
                        {block.items.map((s) => (
                            <div key={s.value} className="sm:px-5 sm:first:pl-0 sm:last:pr-0">
                                <dt className="text-3xl font-semibold tracking-tight text-brand">{s.value}</dt>
                                <dd className="mt-1 text-sm text-pretty text-muted-foreground">{s.text}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>
            )
        case 'callout':
            return (
                <Card className="flex gap-3 bg-tint-amber p-5 sm:p-6">
                    <Lightbulb weight="duotone" className="mt-0.5 size-5 shrink-0 text-tint-amber-foreground" />
                    <div>
                        <p className="text-xs font-semibold tracking-wider text-tint-amber-foreground uppercase">{block.label}</p>
                        <p className="mt-1 leading-relaxed text-pretty text-foreground">{block.text}</p>
                    </div>
                </Card>
            )
        case 'list':
            return (
                <Card className="bg-tint-blue p-5 sm:p-6">
                    <p className="text-xs font-semibold tracking-wider text-tint-blue-foreground uppercase">{block.label}</p>
                    <ul className="mt-3 space-y-2.5">
                        {block.items.map((item) => (
                            <li key={item} className="flex gap-2.5 text-pretty text-foreground">
                                <CheckCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-tint-blue-foreground" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </Card>
            )
        case 'links':
            return (
                <section className="pt-6">
                    <h2 className="text-xl font-semibold tracking-tight text-balance">{block.title}</h2>
                    <p className="mt-2 leading-relaxed text-pretty text-foreground/90">{block.intro}</p>
                    <ul className="mt-4 divide-y divide-border rounded-card shadow-border">
                        {block.items.map((l) => (
                            <li key={l.href}>
                                <a
                                    href={l.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between gap-4 px-4 py-3 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 first:rounded-t-card last:rounded-b-card"
                                >
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium text-foreground">{l.label}</span>
                                        <span className="block truncate text-sm text-brand">{l.text}</span>
                                    </span>
                                    <ArrowSquareOut className="size-4 shrink-0 text-muted-foreground" aria-label="Opens in a new tab" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )
    }
}
