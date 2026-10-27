'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowSquareOut, LockSimple } from '@phosphor-icons/react/ssr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { wordsFor } from '@/lib/parent-words'

/** The gold logo in the corner of every guide, as on the printed guides. */
function CornerLogo() {
    return <Image src="/logo-gold.webp" alt="" width={36} height={36} className="size-9 shrink-0" aria-hidden />
}

/** Navy cover with a gold eyebrow and a gold rule underneath, like the guides' banners. */
function Cover({ eyebrow, title, blurred = false }: { eyebrow: string; title: string; blurred?: boolean }) {
    return (
        <div className="relative border-b-2 border-gold bg-primary px-5 pt-5 pb-6 text-primary-foreground">
            <div className="flex items-start justify-between gap-3">
                <div className={blurred ? 'min-w-0 blur-[3px] select-none' : 'min-w-0'} aria-hidden={blurred || undefined}>
                    <p className="text-[11px] font-semibold tracking-wider text-gold uppercase">{eyebrow}</p>
                    <p className="mt-2 text-base font-semibold text-balance">{title}</p>
                </div>
                <CornerLogo />
            </div>
        </div>
    )
}

export function GuideCard({ href, eyebrow, title, summary, minutes }: { href: string; eyebrow: string; title: string; summary: string; minutes: number }) {
    return (
        <Link href={href} className="group block h-full rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
            <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-150 group-hover:shadow-border-hover">
                <Cover eyebrow={eyebrow} title={title} />
                <div className="flex flex-1 flex-col p-5">
                    <p className="flex-1 text-sm text-pretty text-muted-foreground">{summary}</p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground tabular-nums">{minutes} min read</span>
                        <span className="inline-flex items-center gap-1 font-medium text-brand">
                            Read
                            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                        </span>
                    </div>
                </div>
            </Card>
        </Link>
    )
}

export function PdfResourceCard({
    href,
    eyebrow,
    title,
    summary,
    pages,
}: {
    href: string
    eyebrow: string
    title: string
    summary: string
    pages: number
}) {
    return (
        <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group block h-full rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
            <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-150 group-hover:shadow-border-hover">
                <Cover eyebrow={eyebrow} title={title} />
                <div className="flex flex-1 flex-col p-5">
                    <p className="flex-1 text-sm text-pretty text-muted-foreground">{summary}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground tabular-nums">PDF · {pages} pages</span>
                        <span className="inline-flex items-center gap-1 font-medium text-brand">
                            Open PDF
                            <ArrowSquareOut className="size-4 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                        </span>
                    </div>
                </div>
            </Card>
        </Link>
    )
}

/**
 * A guide for the child that the family can't open yet: the title stays
 * readable so the parent knows what's there; the rest is blurred, with a
 * lock. Opening it explains that it comes with the full programme.
 */
export function LockedCard({ title, summary, childFirstName }: { title: string; summary: string; childFirstName: string | null }) {
    const [open, setOpen] = useState(false)
    const w = wordsFor(childFirstName)
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="group block h-full w-full rounded-card text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                aria-label={`${title}, locked`}
            >
                <Card className="flex h-full flex-col overflow-hidden">
                    <Cover eyebrow={`For ${w.child}`} title={title} blurred />
                    <div className="flex flex-1 flex-col p-5">
                        <p className="font-semibold text-balance text-foreground">{title}</p>
                        <p className="mt-1 flex-1 text-sm text-muted-foreground blur-[3px] select-none" aria-hidden>
                            {summary}
                        </p>
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <Badge tone="outline">
                                <LockSimple weight="bold" />
                                Locked
                            </Badge>
                            <span className="font-medium text-muted-foreground group-hover:text-foreground">How to unlock</span>
                        </div>
                    </div>
                </Card>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <div className="mb-3 grid size-11 place-items-center rounded-full bg-gold-soft text-gold-foreground">
                            <LockSimple weight="duotone" className="size-5" />
                        </div>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            This guide is part of the full Access Oxbridge programme for {w.child}. Once {w.child} is enrolled, all of
                            these guides will open up.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setOpen(false)}>Got it</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
