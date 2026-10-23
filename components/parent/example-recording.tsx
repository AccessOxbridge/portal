'use client'

import { useState } from 'react'
import { FilmStrip, Play } from '@phosphor-icons/react/ssr'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EXAMPLE_RECORDING } from '@/lib/parent-examples'

/**
 * Before the child's first recording: say there are none yet, and offer one
 * example to watch so the parent sees how recordings will work. Labelled
 * "Example" everywhere it appears.
 */
export function ExampleRecording({ childsLabel }: { childsLabel: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="space-y-4">
            <Card className="flex items-start gap-4 p-5">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-tint-violet text-tint-violet-foreground">
                    <FilmStrip weight="duotone" className="size-5" />
                </div>
                <div>
                    <p className="font-semibold">No recordings yet</p>
                    <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                        Recordings of {childsLabel} sessions appear here a few minutes after each session ends. Here is an example.
                    </p>
                </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="group block rounded-card text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    aria-label={`Play ${EXAMPLE_RECORDING.title}`}
                >
                    <Card className="overflow-hidden">
                        <div className="relative grid aspect-video place-items-center bg-primary">
                            <span className="grid size-14 place-items-center rounded-full bg-card/95 text-foreground shadow-border transition-transform duration-150 group-hover:scale-105 motion-reduce:transition-none">
                                <Play weight="fill" className="size-6 translate-x-0.5" />
                            </span>
                            <Badge tone="outline" className="absolute top-3 left-3">
                                Example
                            </Badge>
                        </div>
                        <div className="p-4">
                            <p className="font-medium">{EXAMPLE_RECORDING.title}</p>
                            <p className="text-sm text-muted-foreground">with {EXAMPLE_RECORDING.mentorName}</p>
                        </div>
                    </Card>
                </button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent size="xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {EXAMPLE_RECORDING.title}
                            <Badge tone="outline">Example</Badge>
                        </DialogTitle>
                        <DialogDescription>{EXAMPLE_RECORDING.note}</DialogDescription>
                    </DialogHeader>
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                        {open && (
                            <video
                                src={EXAMPLE_RECORDING.url}
                                controls
                                autoPlay
                                playsInline
                                controlsList="nodownload"
                                className="aspect-video w-full rounded-control bg-black"
                            >
                                Your browser does not support video playback.
                            </video>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
