'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight } from '@phosphor-icons/react/ssr'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ABOUT_ACCESS_OXBRIDGE as ABOUT } from '@/lib/parent-about'
import { PdfReader } from '@/components/parent/pdf-reader'

/** Navy card with the gold logo; "See more information" opens the PDF in a reader. */
export function AboutCard() {
    const [open, setOpen] = useState(false)
    if (!ABOUT.ready) return null
    return (
        <>
            <Card className="overflow-hidden border-b-2 border-gold bg-primary text-primary-foreground">
                <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
                    <Image src="/logo-gold.webp" alt="" width={48} height={48} className="size-12 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold">{ABOUT.title}</p>
                        <p className="text-sm text-pretty text-primary-foreground/75">{ABOUT.summary}</p>
                    </div>
                    <Button variant="secondary" onClick={() => setOpen(true)}>
                        See more information
                        <ArrowRight />
                    </Button>
                </div>
            </Card>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent size="xl">
                    <DialogHeader>
                        <DialogTitle>{ABOUT.title}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[75vh] overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{open && <PdfReader url={ABOUT.url} title={ABOUT.title} />}</div>
                </DialogContent>
            </Dialog>
        </>
    )
}
