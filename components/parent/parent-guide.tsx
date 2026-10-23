import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowSquareOut } from '@phosphor-icons/react/ssr'
import { readingMinutes, type GuideBlock, type ParentGuide } from '@/lib/parent-resources'

/**
 * One parent guide as a portal page: the guide's content in the portal's own
 * type, so it reflows on a phone and there is nothing to download. The navy
 * banner, gold logo and gold accents follow the printed guides.
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

            <header className="mt-4 overflow-hidden rounded-card bg-primary text-primary-foreground">
                <div className="flex items-start justify-between gap-6 px-6 py-8 sm:px-10 sm:py-10">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold tracking-wider text-gold uppercase">{guide.eyebrow}</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{guide.title}</h1>
                        <p className="mt-3 max-w-xl text-base text-pretty text-gold/90 sm:text-lg">{guide.subtitle}</p>
                        <p className="mt-6 text-sm text-primary-foreground/60">{readingMinutes(guide)} min read</p>
                    </div>
                    <Image src="/logo-gold.webp" alt="" width={88} height={88} className="size-14 shrink-0 sm:size-22" aria-hidden />
                </div>
                <div className="h-0.5 bg-gold" />
            </header>

            <div className="mt-8 space-y-6">
                {groupTerms(guide.blocks).map((block, i) => (
                    <Block key={i} block={block} />
                ))}
            </div>

            <p className="mt-12 border-t border-gold pt-4 text-sm text-muted-foreground">
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

/** Gold small-caps label, as in the guides. */
function Eyebrow({ children }: { children: React.ReactNode }) {
    return <p className="text-xs font-semibold tracking-wider text-gold-foreground uppercase">{children}</p>
}

/** The guides' beige panel with a gold left edge. */
function Panel({ children }: { children: React.ReactNode }) {
    return <div className="rounded-r-card border-l-4 border-gold bg-gold-soft p-5 sm:p-6">{children}</div>
}

function SectionTitle({ label, title }: { label: string; title: string }) {
    return (
        <div className="pt-6">
            <Eyebrow>{label}</Eyebrow>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-balance">{title}</h2>
            <div className="mt-3 h-0.5 w-10 rounded-full bg-gold" />
        </div>
    )
}

function Block({ block }: { block: Grouped }) {
    switch (block.type) {
        case 'lead':
            return <p className="text-lg leading-relaxed text-pretty text-foreground">{block.text}</p>
        case 'p':
            return <p className="leading-relaxed text-pretty text-foreground/90">{block.text}</p>
        case 'section':
            return <SectionTitle label={block.label} title={block.title} />
        case 'h3':
            return <h3 className="pt-2 text-lg font-semibold text-balance">{block.text}</h3>
        case 'stage':
            return (
                <h3 className="flex items-center gap-3 pt-4 text-xl font-semibold tracking-tight text-balance">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold text-base font-semibold text-primary tabular-nums">
                        {block.n}
                    </span>
                    {block.title}
                </h3>
            )
        case 'terms':
            return (
                <dl className="divide-y divide-border">
                    {block.items.map((t) => (
                        <div key={t.term} className="py-4 first:pt-0 last:pb-0">
                            <dt className="flex flex-wrap items-baseline gap-x-2 font-semibold text-foreground">
                                {t.term}
                                {t.tag && <span className="text-[11px] font-semibold tracking-wider text-gold-foreground uppercase">{t.tag}</span>}
                            </dt>
                            <dd className="mt-1 leading-relaxed text-pretty text-muted-foreground">{t.text}</dd>
                        </div>
                    ))}
                </dl>
            )
        case 'table':
            return (
                <Panel>
                    <Eyebrow>{block.label}</Eyebrow>
                    <p className="mt-1 text-pretty text-foreground/90">{block.intro}</p>
                    {/* Phones: one stacked row per meaning, so nothing scrolls sideways. */}
                    <dl className="mt-4 divide-y divide-gold/40 sm:hidden">
                        {block.rows.map((row) => (
                            <div key={row[0]} className="py-3 first:pt-0 last:pb-0">
                                <dt className="text-sm text-muted-foreground">{row[0]}</dt>
                                {row.slice(1).map((cell, i) => (
                                    <dd key={i} className="mt-1 flex gap-2 text-sm">
                                        <span className="w-20 shrink-0 text-xs font-semibold tracking-wider text-gold-foreground uppercase">
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
                                <tr className="border-b border-gold/60 text-xs tracking-wider text-gold-foreground uppercase">
                                    {block.columns.map((c) => (
                                        <th key={c} scope="col" className="py-2 pr-4 font-semibold last:pr-0">
                                            {c}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gold/30">
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
                </Panel>
            )
        case 'stats':
            return (
                <Panel>
                    <Eyebrow>{block.label}</Eyebrow>
                    <dl className="mt-4 grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-gold/50">
                        {block.items.map((s) => (
                            <div key={s.value} className="sm:px-5 sm:first:pl-0 sm:last:pr-0">
                                <dt className="text-3xl font-semibold tracking-tight text-gold-foreground">{s.value}</dt>
                                <dd className="mt-1 text-sm text-pretty text-foreground/80">{s.text}</dd>
                            </div>
                        ))}
                    </dl>
                </Panel>
            )
        case 'glance':
            return (
                <Panel>
                    <Eyebrow>{block.label}</Eyebrow>
                    <p className="mt-1 text-pretty text-foreground/90">{block.intro}</p>
                    <ol className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                        {block.items.map((item, i) => (
                            <li key={item} className="flex items-baseline gap-2.5 text-sm font-medium text-foreground">
                                <span className="text-lg font-semibold text-gold-foreground tabular-nums">{i + 1}</span>
                                {item}
                            </li>
                        ))}
                    </ol>
                </Panel>
            )
        case 'callout':
            return (
                <Panel>
                    <Eyebrow>{block.label}</Eyebrow>
                    <p className="mt-1 leading-relaxed text-pretty text-foreground">{block.text}</p>
                </Panel>
            )
        case 'list':
            return (
                <Panel>
                    <Eyebrow>{block.label}</Eyebrow>
                    <ul className="mt-3 space-y-2.5">
                        {block.items.map((item) => (
                            <li key={item} className="flex gap-2.5 text-pretty text-foreground">
                                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold-foreground" aria-hidden />
                                {item}
                            </li>
                        ))}
                    </ul>
                </Panel>
            )
        case 'checklist':
            return (
                <section>
                    <SectionTitle label={block.label} title={block.title} />
                    <p className="mt-3 leading-relaxed text-pretty text-foreground/90">{block.intro}</p>
                    <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
                        {block.items.map((item) => (
                            <li key={item} className="flex items-start gap-3 border-b border-border py-2.5 text-sm text-foreground">
                                <span className="mt-0.5 size-4 shrink-0 rounded-[4px] border-[1.5px] border-gold" aria-hidden />
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>
            )
        case 'links':
            return (
                <section className="pt-6">
                    <h2 className="text-xl font-semibold tracking-tight text-balance">{block.title}</h2>
                    <p className="mt-2 leading-relaxed text-pretty text-foreground/90">{block.intro}</p>
                    <ul className="mt-4 divide-y divide-border rounded-card bg-card shadow-border">
                        {block.items.map((l) => (
                            <li key={l.href}>
                                <a
                                    href={l.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between gap-4 px-4 py-3 outline-none first:rounded-t-card last:rounded-b-card hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40"
                                >
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium text-foreground">{l.label}</span>
                                        <span className="block truncate text-sm text-gold-foreground">{l.text}</span>
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
