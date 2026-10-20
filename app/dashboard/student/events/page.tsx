'use client'

import Link from 'next/link'
import { VideoCamera as Video, MapPin, ArrowRight, CalendarDots as CalendarDays } from '@phosphor-icons/react/ssr'

export default function EventsPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Events</h1>
                <p className="text-muted-foreground mt-1">
                    Discover webinars and in-person events to support your Oxbridge journey
                </p>
            </div>

            {/* Event Categories */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Webinars Card */}
                <Link
                    href="/dashboard/student/events/webinars"
                    className="group rounded-card bg-card p-6 text-foreground shadow-border transition-shadow duration-150 ease-out hover:shadow-border-hover"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="grid size-12 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                            <Video weight="duotone" className="size-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Webinars</h2>
                            <p className="text-sm text-muted-foreground">Online sessions</p>
                        </div>
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground text-pretty">
                        Join live online sessions with mentors, admissions experts, and current Oxbridge students from anywhere.
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-brand transition-[gap] duration-150 group-hover:gap-3">
                        <span>View webinars</span>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </Link>

                {/* In Person Events Card */}
                <Link
                    href="/dashboard/student/events/in-person"
                    className="group rounded-card bg-card p-6 text-foreground shadow-border transition-shadow duration-150 ease-out hover:shadow-border-hover"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="grid size-12 place-items-center rounded-full bg-tint-rose text-tint-rose-foreground">
                            <MapPin weight="duotone" className="size-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">In-person events</h2>
                            <p className="text-sm text-muted-foreground">Meet face-to-face</p>
                        </div>
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground text-pretty">
                        Attend exclusive networking events, campus tours, workshops, and mock interview days across the UK.
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-brand transition-[gap] duration-150 group-hover:gap-3">
                        <span>View events</span>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="bg-muted/60 rounded-card p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-muted-foreground" />
                    Your event activity
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card rounded-control p-4 text-center">
                        <div className="text-2xl font-semibold text-brand">3</div>
                        <div className="text-xs text-muted-foreground">Upcoming webinars</div>
                    </div>
                    <div className="bg-card rounded-control p-4 text-center">
                        <div className="text-2xl font-semibold text-destructive">2</div>
                        <div className="text-xs text-muted-foreground">Upcoming events</div>
                    </div>
                    <div className="bg-card rounded-control p-4 text-center">
                        <div className="text-2xl font-semibold text-success">5</div>
                        <div className="text-xs text-muted-foreground">Events attended</div>
                    </div>
                    <div className="bg-card rounded-control p-4 text-center">
                        <div className="text-2xl font-semibold text-tint-violet-foreground">2</div>
                        <div className="text-xs text-muted-foreground">Recordings available</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
