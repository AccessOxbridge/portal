'use client'

import { useEffect, useRef, useState } from 'react'
import {
    Bell as LBell,
    Calendar as LCalendar,
    Check as LCheck,
    FileText as LFileText,
    Film as LFilm,
    Home as LHome,
    LogOut as LLogOut,
    MessageCircle as LMessage,
    Plus as LPlus,
    Search as LSearch,
    Settings as LSettings,
    Upload as LUpload,
    Users as LUsers,
    X as LX,
} from 'lucide-react'
import {
    Bell,
    CalendarBlank,
    ChatCircle,
    Check,
    FileText,
    FilmStrip,
    Gear,
    House,
    MagnifyingGlass,
    Plus,
    SignOut,
    UploadSimple,
    Users,
    X,
    type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import { cn } from '@/utils/lib'

// TEMPORARY (phase 0): removed once the blue and the icon set are chosen.

const BLUES = [
    { id: '1', name: 'Oxford navy', hex: '#0F2557', note: 'Closest to today' },
    { id: '2', name: 'Deep navy', hex: '#13275A', note: 'Recommended: softer, balanced' },
    { id: '3', name: 'Royal blue', hex: '#1E3A8A', note: 'Brighter, more energy' },
    { id: '4', name: 'Ink slate', hex: '#1C2B4A', note: 'Muted, most premium' },
]

const PAGES = [
    { path: '/dashboard', label: 'My home' },
    { path: '/dashboard/settings', label: 'Settings' },
]

const NAV: { label: string; lucide: typeof LHome; phosphor: PhosphorIcon }[] = [
    { label: 'Home', lucide: LHome, phosphor: House },
    { label: 'My sessions', lucide: LCalendar, phosphor: CalendarBlank },
    { label: 'Recordings', lucide: LFilm, phosphor: FilmStrip },
    { label: 'Messages', lucide: LMessage, phosphor: ChatCircle },
    { label: 'My mentors', lucide: LUsers, phosphor: Users },
    { label: 'Reports', lucide: LFileText, phosphor: FileText },
]

const UI_ICONS: { label: string; lucide: typeof LHome; phosphor: PhosphorIcon }[] = [
    { label: 'Notifications', lucide: LBell, phosphor: Bell },
    { label: 'Search', lucide: LSearch, phosphor: MagnifyingGlass },
    { label: 'Add', lucide: LPlus, phosphor: Plus },
    { label: 'Done', lucide: LCheck, phosphor: Check },
    { label: 'Close', lucide: LX, phosphor: X },
    { label: 'Upload', lucide: LUpload, phosphor: UploadSimple },
    { label: 'Settings', lucide: LSettings, phosphor: Gear },
    { label: 'Sign out', lucide: LLogOut, phosphor: SignOut },
]

const FRAME_W = 1440
const FRAME_H = 900

function SectionTitle({ title, sub }: { title: string; sub: string }) {
    return (
        <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">{sub}</p>
        </div>
    )
}

function BlueCompare() {
    const [path, setPath] = useState(PAGES[0].path)
    const [scale, setScale] = useState(0.3)
    const wrap = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fit = () => {
            const w = (wrap.current?.clientWidth ?? 1200) - 16
            setScale(Math.min(0.6, w / 2 / FRAME_W))
        }
        fit()
        window.addEventListener('resize', fit)
        return () => window.removeEventListener('resize', fit)
    }, [])

    // Today's sidebar and headings use the legacy navy token, so swapping that
    // one variable shows each candidate across the real page.
    function tint(frame: HTMLIFrameElement, hex: string) {
        frame.contentDocument?.documentElement.style.setProperty('--color-legacy-accent', hex)
    }

    return (
        <section ref={wrap}>
            <SectionTitle
                title="1. Sidebar blue on the real portal"
                sub="Today's layout with each candidate swapped in for the current navy (#092C68). The redesigned shell comes in phase 1; this is only to judge the colour."
            />
            <div className="mb-4 flex flex-wrap gap-2">
                {PAGES.map((p) => (
                    <button
                        key={p.path}
                        type="button"
                        onClick={() => setPath(p.path)}
                        className={cn(
                            'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                            p.path === path ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-border',
                        )}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
                {BLUES.map((b) => (
                    <figure key={b.id}>
                        <figcaption className="mb-2 flex items-center gap-2 text-sm">
                            <span className="size-3 rounded-full" style={{ background: b.hex }} />
                            <span className="font-medium text-foreground">
                                {b.id}. {b.name}
                            </span>
                            <span className="text-muted-foreground tabular-nums">{b.hex}</span>
                            <span className="text-muted-foreground">· {b.note}</span>
                        </figcaption>
                        <div
                            className="overflow-hidden rounded-card shadow-border"
                            style={{ width: FRAME_W * scale, height: FRAME_H * scale }}
                        >
                            <iframe
                                key={path}
                                title={`${b.name} preview`}
                                src={path}
                                onLoad={(e) => tint(e.currentTarget, b.hex)}
                                style={{
                                    width: FRAME_W,
                                    height: FRAME_H,
                                    transform: `scale(${scale})`,
                                    transformOrigin: '0 0',
                                    border: 0,
                                }}
                            />
                        </div>
                    </figure>
                ))}
            </div>
        </section>
    )
}

function IconCompare() {
    return (
        <section>
            <SectionTitle
                title="2. Icons: Lucide (today) vs Phosphor (recommended)"
                sub="The student sidebar on the new navy. Phosphor uses a filled icon for the active item and the regular weight elsewhere; Lucide has outline only."
            />
            <div className="grid gap-4 md:grid-cols-2">
                {(['lucide', 'phosphor'] as const).map((set) => (
                    <div key={set} className="overflow-hidden rounded-card shadow-border">
                        <div className="bg-sidebar p-3 font-ui">
                            <p className="px-2.5 pb-3 text-sm font-semibold text-white">
                                {set === 'lucide' ? 'Lucide' : 'Phosphor'}
                            </p>
                            {NAV.map((item, i) => {
                                const active = i === 0
                                const Lucide = item.lucide
                                const Ph = item.phosphor
                                return (
                                    <div
                                        key={item.label}
                                        className={cn(
                                            'flex items-center gap-3 rounded-control px-2.5 py-2 text-[15px]',
                                            active ? 'bg-sidebar-active text-white' : 'text-sidebar-foreground',
                                        )}
                                    >
                                        {set === 'lucide' ? (
                                            <Lucide className="size-5" strokeWidth={active ? 2 : 1.75} />
                                        ) : (
                                            <Ph className="size-5" weight={active ? 'fill' : 'regular'} />
                                        )}
                                        {item.label}
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex flex-wrap gap-4 bg-card p-4">
                            {UI_ICONS.map((item) => {
                                const Lucide = item.lucide
                                const Ph = item.phosphor
                                return (
                                    <span key={item.label} title={item.label} className="text-foreground">
                                        {set === 'lucide' ? <Lucide className="size-5" strokeWidth={1.75} /> : <Ph className="size-5" />}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

const SWATCHES = [
    { name: 'Sidebar / primary', cls: 'bg-sidebar', note: 'white text 14.3:1' },
    { name: 'Brand blue', cls: 'bg-brand', note: '5.2:1 on white' },
    { name: 'Background', cls: 'bg-background shadow-border', note: 'stone 50' },
    { name: 'Card', cls: 'bg-card shadow-border', note: 'white' },
    { name: 'Muted', cls: 'bg-muted', note: 'stone 100' },
    { name: 'Input border', cls: 'bg-input', note: '3.2:1 on white' },
    { name: 'Success', cls: 'bg-success', note: '5.5:1' },
    { name: 'Warning', cls: 'bg-warning', note: '5.0:1' },
    { name: 'Destructive', cls: 'bg-destructive', note: '4.8:1' },
]

const TINTS = [
    { name: 'Oxford', cls: 'bg-tint-blue text-tint-blue-foreground', icon: House },
    { name: 'PPE', cls: 'bg-tint-violet text-tint-violet-foreground', icon: FileText },
    { name: '2027 entry', cls: 'bg-tint-amber text-tint-amber-foreground', icon: CalendarBlank },
    { name: '6.5 hours left', cls: 'bg-tint-green text-tint-green-foreground', icon: Check },
    { name: 'Missed', cls: 'bg-tint-rose text-tint-rose-foreground', icon: X },
]

function Foundation() {
    return (
        <section className="font-ui">
            <SectionTitle
                title="3. The new foundation"
                sub="Tokens, warm tints, and a first look at option B (students and mentors) next to option A (admin). Built with the real tokens and Geist."
            />

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
                {SWATCHES.map((s) => (
                    <div key={s.name}>
                        <div className={cn('h-12 rounded-control', s.cls)} />
                        <p className="mt-1.5 text-xs font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.note}</p>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
                {TINTS.map((t) => {
                    const Ico = t.icon
                    return (
                        <span key={t.name} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium', t.cls)}>
                            <Ico className="size-4" weight="bold" />
                            {t.name}
                        </span>
                    )
                })}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {/* Option B: student and mentor */}
                <div className="rounded-sheet bg-background p-5 shadow-border">
                    <p className="text-xs font-medium text-muted-foreground">Option B · students and mentors · 16px</p>
                    <div className="mt-3 rounded-card bg-tint-blue p-4 ring-1 ring-tint-blue-foreground/10">
                        <p className="text-sm font-medium text-[#1d4ed8]">Next session · in 2 days</p>
                        <p className="mt-1 text-base font-semibold text-tint-blue-foreground">Personal statement review</p>
                        <p className="text-sm text-[#1e40af] tabular-nums">Tue 14 Oct, 17:00 · Dr Patel</p>
                        <div className="mt-4 flex gap-2">
                            <span className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Join session</span>
                            <span className="rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-border">Reschedule</span>
                        </div>
                    </div>

                    <div className="mt-4 rounded-card bg-card p-4 shadow-border">
                        <p className="text-sm font-medium text-foreground">Application timeline</p>
                        <div className="mt-3 h-1.5 rounded-full bg-muted">
                            <div className="h-full w-[38%] rounded-full bg-brand" />
                        </div>
                        <ol className="mt-4 space-y-3 text-base">
                            <li className="flex items-center gap-3 text-foreground">
                                <span className="grid size-6 place-items-center rounded-full bg-success text-white">
                                    <Check className="size-3.5" weight="bold" />
                                </span>
                                Profile complete
                            </li>
                            <li className="flex items-center gap-3 font-medium text-foreground">
                                <span className="grid size-6 place-items-center rounded-full ring-2 ring-brand">
                                    <span className="size-2.5 rounded-full bg-brand" />
                                </span>
                                Personal statement
                            </li>
                            <li className="flex items-center gap-3 text-muted-foreground">
                                <span className="size-6 rounded-full border-2 border-dashed border-input" />
                                Admissions test
                            </li>
                            <li className="flex items-center gap-3 text-muted-foreground">
                                <span className="size-6 rounded-full border-2 border-dashed border-input" />
                                Interview
                            </li>
                        </ol>
                    </div>

                    <div className="mt-4 space-y-2 rounded-card bg-card p-4 shadow-border" aria-hidden="true">
                        <p className="text-xs font-medium text-muted-foreground">Loading skeleton</p>
                        <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
                        <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
                        <div className="h-9 w-32 animate-pulse rounded-full bg-muted" />
                    </div>
                </div>

                {/* Option A: admin */}
                <div className="rounded-sheet bg-background p-5 shadow-border">
                    <p className="text-xs font-medium text-muted-foreground">Option A · admin · compact 14px</p>
                    <div className="mt-3 overflow-hidden rounded-card bg-card shadow-border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                    <th className="px-3 py-2 font-medium">Student</th>
                                    <th className="px-3 py-2 font-medium">Mentor</th>
                                    <th className="px-3 py-2 font-medium">Status</th>
                                    <th className="px-3 py-2 text-right font-medium">Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Maya Shah', 'Dr Patel', 'Scheduled', '6.5', 'bg-tint-blue text-tint-blue-foreground'],
                                    ['Leo Grant', 'Ms Okafor', 'Completed', '2.0', 'bg-tint-green text-tint-green-foreground'],
                                    ['Ana Ruiz', 'Not set', 'Missed', '0.0', 'bg-tint-rose text-tint-rose-foreground'],
                                ].map(([s, m, st, h, cls]) => (
                                    <tr key={s} className="border-b border-border last:border-0 hover:bg-muted/60">
                                        <td className="px-3 py-2 font-medium text-foreground">{s}</td>
                                        <td className={cn('px-3 py-2', m === 'Not set' ? 'text-muted-foreground' : 'text-foreground')}>{m}</td>
                                        <td className="px-3 py-2">
                                            <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', cls)}>{st}</span>
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{h}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <span className="rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Approve</span>
                        <span className="rounded-control bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-border">Export</span>
                        <span className="rounded-control px-3 py-1.5 text-sm font-medium text-destructive">Decline</span>
                    </div>
                    <div className="mt-4 rounded-control border border-input bg-card px-3 py-2 text-sm text-muted-foreground">
                        Input border at 3.2:1
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function UiPreviewContent() {
    return (
        <div className="space-y-12 pb-16">
            <div>
                <p className="text-sm font-medium text-muted-foreground">UI revamp · phase 0 · development only</p>
                <h1 className="mt-1 text-2xl font-semibold text-foreground">Choose the blue and the icons</h1>
            </div>
            <BlueCompare />
            <IconCompare />
            <Foundation />
        </div>
    )
}
