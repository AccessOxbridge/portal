'use client'

import { useState } from 'react'
import { Books, Check, Compass, GraduationCap } from '@phosphor-icons/react/ssr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/utils/lib'
import { yearlySaving, type Programme, type ProgrammeIcon } from '@/lib/parent-programmes'
import type { ParentWords } from '@/lib/parent-words'

const ICONS: Record<ProgrammeIcon, typeof Compass> = { compass: Compass, books: Books, graduation: GraduationCap }

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`

/** Swap {child}, {Child}, {childs} and {Childs} for the child's name. */
function fill(text: string, w: ParentWords) {
    return text.replace(/\{(child|Child|childs|Childs)\}/g, (_, k: keyof ParentWords) => w[k])
}

/**
 * The three programmes side by side, after Claude's upgrade page: icon, name,
 * price, one button, a reassurance line and a ticked list. Nothing is sold
 * yet, so the buttons open a "coming soon" note.
 */
export function ProgrammeTiers({ programmes, words }: { programmes: Programme[]; words: ParentWords }) {
    const [chosen, setChosen] = useState<Programme | null>(null)
    return (
        <>
            <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
                {programmes.map((p) => (
                    <ProgrammeCard key={p.id} programme={p} words={words} onChoose={() => setChosen(p)} />
                ))}
            </div>

            <Dialog open={!!chosen} onOpenChange={(open) => !open && setChosen(null)}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>{chosen?.name} is coming soon</DialogTitle>
                        <DialogDescription>
                            Online sign-up for Access Oxbridge programmes isn’t open yet. You’ll be able to choose a
                            programme for {words.child} here very soon.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setChosen(null)}>Got it</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

function ProgrammeCard({ programme: p, words, onChoose }: { programme: Programme; words: ParentWords; onChoose: () => void }) {
    const [yearly, setYearly] = useState(false)
    const Icon = ICONS[p.icon]
    const saving = yearlySaving(p)
    const price = yearly && p.yearly ? p.yearly : p.monthly
    const free = p.monthly === 0

    return (
        <Card className={cn('flex flex-col overflow-hidden', p.recommended && 'ring-2 ring-gold')}>
            <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-3">
                    <Icon weight="light" className="size-12 text-gold-foreground" aria-hidden />
                    {saving !== null ? (
                        <BillingToggle yearly={yearly} onChange={setYearly} saving={saving} />
                    ) : (
                        p.recommended && <Badge tone="solid">Recommended</Badge>
                    )}
                </div>

                <h2 className="mt-5 text-2xl font-semibold tracking-tight">{p.name}</h2>
                {/* Two lines reserved side by side, so prices and buttons line up across cards. */}
                <p className="mt-1 text-pretty text-muted-foreground lg:min-h-12">{fill(p.tagline, words)}</p>

                <div className="mt-6 flex min-h-14 flex-wrap items-end gap-x-3 gap-y-1">
                    <p className="text-4xl font-semibold tracking-tight tabular-nums">
                        {p.from && <span className="mr-2">From</span>}
                        {gbp(price)}
                    </p>
                    {!free && (
                        <p className="pb-1 text-xs leading-tight text-muted-foreground">
                            per month
                            <br />
                            {yearly ? 'billed yearly' : 'billed monthly'}
                        </p>
                    )}
                </div>

                <Button
                    variant={free ? 'secondary' : 'default'}
                    disabled={free}
                    onClick={onChoose}
                    className="mt-6 w-full"
                >
                    {p.cta}
                </Button>
                <p className="mt-2.5 min-h-5 text-center text-sm text-muted-foreground">{p.note}</p>
            </div>

            <div className="flex-1 border-t border-border p-6 sm:p-7">
                {p.lead && <p className="mb-3 text-sm font-medium text-foreground">{p.lead}</p>}
                <ul className="space-y-2.5">
                    {p.features.map((f) => (
                        <li key={f} className="flex gap-2.5 text-sm text-pretty text-foreground/90">
                            <Check weight="bold" className="mt-0.5 size-4 shrink-0 text-gold-foreground" aria-hidden />
                            {fill(f, words)}
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    )
}

/** Monthly or yearly, as on Claude's Pro card. */
function BillingToggle({ yearly, onChange, saving }: { yearly: boolean; onChange: (v: boolean) => void; saving: number }) {
    const option = (active: boolean) =>
        cn(
            'rounded-full px-3 py-1 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/40',
            active ? 'bg-card text-foreground shadow-border' : 'text-muted-foreground hover:text-foreground'
        )
    return (
        <div role="group" aria-label="Billing" className="flex shrink-0 items-center rounded-full bg-muted p-1">
            <button type="button" aria-pressed={!yearly} onClick={() => onChange(false)} className={option(!yearly)}>
                Monthly
            </button>
            <button type="button" aria-pressed={yearly} onClick={() => onChange(true)} className={option(yearly)}>
                Yearly <span className="text-gold-foreground">· Save {saving}%</span>
            </button>
        </div>
    )
}
