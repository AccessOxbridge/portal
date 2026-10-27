import { FilmStrip } from '@phosphor-icons/react/ssr'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EXAMPLE_RECORDING } from '@/lib/parent-examples'

/**
 * Before the child's first recording: say there are none yet, and offer one
 * non-interactive example so the parent sees where recordings will appear.
 * Labelled "Example" everywhere it appears.
 */
export function ExampleRecording({ childsLabel }: { childsLabel: string }) {
    return (
        <div className="space-y-4">
            <Card className="flex items-start gap-4 p-5">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-tint-violet text-tint-violet-foreground">
                    <FilmStrip weight="duotone" className="size-5" />
                </div>
                <div>
                    <p className="font-semibold">No recordings yet</p>
                    <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                        Recordings of {childsLabel} sessions appear here a few minutes after each session ends. An example is shown below.
                    </p>
                </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="block rounded-card text-left">
                    <Card className="overflow-hidden select-none">
                        <div className="relative grid aspect-video place-items-center bg-primary">
                            <span className="grid size-14 place-items-center rounded-full bg-card/95 text-foreground shadow-border">
                                <FilmStrip weight="duotone" className="size-7" />
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
                </div>
            </div>
        </div>
    )
}
