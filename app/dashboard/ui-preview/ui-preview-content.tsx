'use client'

import { useState, type ReactNode } from 'react'
import {
    BookOpen,
    CalendarBlank,
    ChatCircle,
    DotsThree,
    Exam,
    GraduationCap,
    PencilSimple,
    Plus,
    Star,
    Trash,
} from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { Checkbox, Switch } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, CountBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ProgressBar, ProgressRing, Steps } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SelectField } from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'
import {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/overlay'

type Density = 'comfortable' | 'compact'

/**
 * The revamp's component gallery (docs/ui-revamp-plan.md, phase 1). Every
 * shared component in one place, in both densities, with sample content only.
 * Nothing here reads or writes data.
 */
export default function UiPreviewContent() {
    const [density, setDensity] = useState<Density>('comfortable')
    const [saving, setSaving] = useState(false)
    const [subject, setSubject] = useState('')

    const fakeSave = () => {
        setSaving(true)
        setTimeout(() => {
            setSaving(false)
            toast.success('Saved', { description: 'Sample only. Nothing was stored.' })
        }, 1200)
    }

    return (
        <div data-density={density} className="space-y-10 pb-16">
            <PageHeader
                eyebrow="UI revamp, phase 1"
                title="Component gallery"
                description="Every shared component in the new style. Switch density to compare the student and mentor look with the admin look."
                actions={
                    <div role="radiogroup" aria-label="Density" className="inline-flex rounded-full bg-muted p-1">
                        {(['comfortable', 'compact'] as const).map((d) => (
                            <button
                                key={d}
                                role="radio"
                                aria-checked={density === d}
                                onClick={() => setDensity(d)}
                                className={cn(
                                    'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors duration-150',
                                    density === d ? 'bg-card text-foreground shadow-border' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                }
            />

            <Section title="Buttons" note="Press scales to 0.96. Disabled buttons don't move.">
                <div className="flex flex-wrap items-center gap-3">
                    <Button>Book a session</Button>
                    <Button variant="brand">Continue</Button>
                    <Button variant="secondary">Cancel</Button>
                    <Button variant="outline">
                        <CalendarBlank /> Reschedule
                    </Button>
                    <Button variant="ghost">View all</Button>
                    <Button variant="destructive">Cancel session</Button>
                    <Button variant="destructive-ghost">
                        <Trash /> Remove
                    </Button>
                    <Button variant="link">Read the guide</Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon" variant="outline" aria-label="Edit">
                        <PencilSimple />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="More">
                        <DotsThree weight="bold" />
                    </Button>
                    <Button loading={saving} onClick={fakeSave}>
                        {saving ? 'Saving...' : 'Save (shows a toast)'}
                    </Button>
                    <Button disabled>Disabled</Button>
                </div>
            </Section>

            <Section title="Form fields" note="44px tall and 16px text on phones, so iOS never zooms in.">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Full name" htmlFor="g-name" help="As it appears on your UCAS form.">
                        <Input id="g-name" placeholder="Jamie Patel" />
                    </Field>
                    <Field label="School email" htmlFor="g-email" error="Enter an email address like name@school.org.uk">
                        <Input id="g-email" defaultValue="jamie@" aria-invalid />
                    </Field>
                    <Field label="Subject" htmlFor="g-subject">
                        <SelectField id="g-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
                            <option value="">Select a subject</option>
                            <option value="maths">Mathematics</option>
                            <option value="law">Law</option>
                            <option value="medicine">Medicine</option>
                            <option value="ppe">PPE</option>
                        </SelectField>
                    </Field>
                    <Field label="Predicted grades" htmlFor="g-grades" optional>
                        <Input id="g-grades" placeholder="A*A*A" />
                    </Field>
                    <Field label="What would you like help with?" htmlFor="g-notes" className="sm:col-span-2">
                        <Textarea id="g-notes" placeholder="Personal statement, interview practice, admissions tests..." />
                    </Field>
                </div>
                <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2.5 text-base in-data-[density=compact]:text-sm">
                        <Checkbox defaultChecked /> Email me session reminders
                    </label>
                    <label className="flex items-center gap-2.5 text-base in-data-[density=compact]:text-sm">
                        <Switch defaultChecked /> Text message reminders
                    </label>
                </div>
            </Section>

            <Section title="Cards, badges and avatars">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Next session</CardTitle>
                            <CardDescription>Thursday 9 October, 17:00 UK time</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-3">
                            <Avatar name="Eleanor Whitfield" size="md" />
                            <div className="min-w-0">
                                <p className="font-medium text-foreground">Eleanor Whitfield</p>
                                <p className="text-sm text-muted-foreground">Law, Balliol College</p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button size="sm">Join on Zoom</Button>
                            <Button size="sm" variant="ghost">Reschedule</Button>
                        </CardFooter>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Hours</CardTitle>
                            <CardDescription>Used this term</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-4">
                            <ProgressRing value={6} max={10} label="6 of 10 hours used">
                                <span className="text-sm font-semibold">6/10</span>
                            </ProgressRing>
                            <div className="flex-1 space-y-2">
                                <ProgressBar value={60} label="Hours used" />
                                <p className="text-sm text-muted-foreground">4 hours remaining</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                            <CardDescription>Empty values read as None or Not set.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                <dt className="text-muted-foreground">Course</dt>
                                <dd className="text-foreground">Law</dd>
                                <dt className="text-muted-foreground">Admissions test</dt>
                                <dd className="text-muted-foreground">Not set</dd>
                                <dt className="text-muted-foreground">Mentor</dt>
                                <dd className="text-muted-foreground">None</dd>
                            </dl>
                        </CardContent>
                    </Card>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge>Draft</Badge>
                    <Badge tone="blue">Upcoming</Badge>
                    <Badge tone="green">Completed</Badge>
                    <Badge tone="amber">Awaiting reply</Badge>
                    <Badge tone="rose">Cancelled</Badge>
                    <Badge tone="violet">
                        <Star weight="fill" /> Top mentor
                    </Badge>
                    <Badge tone="solid">New</Badge>
                    <Badge tone="outline">Oxford</Badge>
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        Messages <CountBadge count={3} />
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s, i) => (
                        <Avatar key={s} size={s} name={['Ade Okafor', 'Mei Lin', 'Sam Hughes', 'Priya Shah', 'Tom Clarke'][i]} />
                    ))}
                </div>
            </Section>

            <Section title="Progress steps" note="Done is a solid check, current is a blue ring, upcoming is a dashed circle.">
                <Card className="max-w-md">
                    <CardContent className="pt-6">
                        <Steps
                            steps={[
                                { label: 'Create your account', state: 'done' },
                                { label: 'Tell us your subject', state: 'done' },
                                { label: 'Meet your mentor', hint: 'Book your first session to continue', state: 'current' },
                                { label: 'Personal statement review', state: 'upcoming' },
                                { label: 'Mock interview', state: 'upcoming' },
                            ]}
                        />
                    </CardContent>
                </Card>
            </Section>

            <Section title="Tabs" note="Tabs switch instantly. They're used too often to animate.">
                <Tabs defaultValue="upcoming">
                    <TabsList>
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="past">Past</TabsTrigger>
                        <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upcoming" className="pt-4 text-muted-foreground">2 sessions booked.</TabsContent>
                    <TabsContent value="past" className="pt-4 text-muted-foreground">5 sessions completed.</TabsContent>
                    <TabsContent value="cancelled" className="pt-4 text-muted-foreground">None</TabsContent>
                </Tabs>
            </Section>

            <Section title="Menus, popovers and tooltips" note="Each grows from its trigger, 150ms.">
                <div className="flex flex-wrap items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Session options <DotsThree weight="bold" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Thursday 17:00</DropdownMenuLabel>
                            <DropdownMenuItem>
                                <CalendarBlank /> Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <ChatCircle /> Message mentor
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive">
                                <Trash /> Cancel session
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline">What counts as an hour?</Button>
                        </PopoverTrigger>
                        <PopoverContent className="max-w-xs text-sm text-muted-foreground">
                            Each 60-minute session uses one hour. Cancelling more than 24 hours ahead gives the hour back.
                        </PopoverContent>
                    </Popover>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Add a target">
                                <Plus />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add a target</TooltipContent>
                    </Tooltip>
                </div>
            </Section>

            <Section title="Dialogs" note="Centred on desktop. A bottom sheet on phones that you can swipe down to close.">
                <div className="flex flex-wrap gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">Open a dialog</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Cancel this session?</DialogTitle>
                                <DialogDescription>
                                    Thursday 9 October at 17:00 with Eleanor. You&apos;ll get the hour back.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogBody className="text-sm text-muted-foreground">
                                Sample only. Nothing happens when you confirm.
                            </DialogBody>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="secondary">Keep session</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                    <Button variant="destructive">Cancel session</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={() => toast('Session booked', { description: 'Thursday at 17:00. Sample only.' })}>
                        Show a toast
                    </Button>
                    <Button variant="outline" onClick={() => toast.error('Couldn\'t send', { description: 'Check your connection and try again.' })}>
                        Show an error toast
                    </Button>
                </div>
            </Section>

            <Section title="Loading" note="Skeletons shaped like the content, with a slow, quiet pulse.">
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <LoadingRegion label="Loading sessions">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="size-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-2/5" />
                                        <Skeleton className="h-3.5 w-3/5" />
                                    </div>
                                </div>
                                <Skeleton className="mt-5 h-9 w-32 rounded-full" />
                            </LoadingRegion>
                        </CardContent>
                    </Card>
                    <Card className="grid place-items-center py-10">
                        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <Spinner className="size-5" /> Loading your messages
                        </span>
                    </Card>
                </div>
            </Section>

            <Section title="Empty states">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <EmptyState
                            icon={CalendarBlank}
                            title="No sessions yet"
                            description="When you book a session with your mentor, it shows up here."
                            action={<Button size="sm">Book a session</Button>}
                        />
                    </Card>
                    <Card>
                        <EmptyState icon={BookOpen} title="No resources saved" description="Save guides and past papers to find them quickly." />
                    </Card>
                    <Card>
                        <EmptyState icon={Exam} title="No reports yet" description="Your mentor writes a short report after each session." />
                    </Card>
                </div>
            </Section>

            <Section title="Colour" note="Navy for the sidebar and main actions, a brighter blue for links and progress, soft tints for status.">
                <div className="flex flex-wrap gap-3">
                    {[
                        ['bg-primary', 'Navy, primary'],
                        ['bg-brand', 'Blue, brand'],
                        ['bg-success', 'Success'],
                        ['bg-warning', 'Warning'],
                        ['bg-destructive', 'Destructive'],
                        ['bg-tint-blue', 'Tint blue'],
                        ['bg-tint-violet', 'Tint violet'],
                        ['bg-tint-amber', 'Tint amber'],
                        ['bg-tint-green', 'Tint green'],
                        ['bg-tint-rose', 'Tint rose'],
                        ['bg-muted', 'Muted'],
                    ].map(([cls, label]) => (
                        <div key={cls} className="w-28">
                            <div className={cn('h-14 rounded-control shadow-border', cls)} />
                            <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
                        </div>
                    ))}
                </div>
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap weight="duotone" className="size-5 text-brand" /> Icons are Phosphor: regular by default, fill when active, duotone in empty states.
                </p>
            </Section>
        </div>
    )
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-foreground in-data-[density=compact]:text-base">{title}</h2>
                {note && <p className="mt-0.5 text-sm text-muted-foreground">{note}</p>}
            </div>
            {children}
        </section>
    )
}
