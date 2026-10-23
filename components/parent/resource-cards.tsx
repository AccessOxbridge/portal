'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpenText, EnvelopeSimple, LockSimple } from '@phosphor-icons/react/ssr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SUCCESS_MANAGER, wordsFor } from '@/lib/parent-words'

export function GuideCard({ href, eyebrow, title, summary, minutes }: { href: string; eyebrow: string; title: string; summary: string; minutes: number }) {
    return (
        <Link
            href={href}
            className="group block rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
            <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-150 group-hover:shadow-md">
                <div className="bg-primary px-5 pt-5 pb-6 text-primary-foreground">
                    <p className="text-[11px] font-semibold tracking-wider text-primary-foreground/70 uppercase">{eyebrow}</p>
                    <p className="mt-2 text-lg font-semibold text-balance">{title}</p>
                </div>
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

/**
 * A guide this family can't open yet: the title stays readable so the parent
 * knows what's there; the rest is blurred behind a lock. Opening it explains
 * how to unlock it, with Claire's contact.
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
                <Card className="relative flex h-full flex-col overflow-hidden">
                    <div className="relative bg-primary/85 px-5 pt-5 pb-6 text-primary-foreground">
                        <div className="blur-[3px] select-none" aria-hidden>
                            <p className="text-[11px] font-semibold tracking-wider uppercase opacity-70">For {w.child}</p>
                            <p className="mt-2 text-lg font-semibold">{title}</p>
                        </div>
                        <span className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-card text-foreground shadow-border">
                            <LockSimple weight="bold" className="size-4" />
                        </span>
                    </div>
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
                        <div className="mb-3 grid size-11 place-items-center rounded-full bg-muted text-foreground">
                            <LockSimple weight="duotone" className="size-5" />
                        </div>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            This guide is part of the full Access Oxbridge programme for {w.child}. Claire, your success manager,
                            can unlock it and tell you what’s included.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BookOpenText className="size-4 shrink-0" />
                            The guides for parents stay open to you in the meantime.
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            Close
                        </Button>
                        <Button asChild>
                            <a href={`mailto:${SUCCESS_MANAGER.email}?subject=${encodeURIComponent(`Unlocking “${title}”`)}`}>
                                <EnvelopeSimple weight="bold" />
                                Email Claire
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
