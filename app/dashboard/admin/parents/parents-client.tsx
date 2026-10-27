'use client'

import { useState, useTransition } from 'react'
import { ArrowsClockwise, FileText, Link as LinkIcon, LinkBreak, MagnifyingGlass, PencilSimple, Plus, UserList, UsersThree } from '@phosphor-icons/react/ssr'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { confirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SelectField } from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'
import { formatBytes, UNIVERSITY_PREFERENCES, type ParentDocument, type StudentInfo } from '@/lib/parent-student-info'
import { createParentAccount, linkParent, unlinkParent, updateChildName } from './actions'

export type ParentRow = {
    id: string
    name: string
    email: string
    childFirstName: string | null
    link: { studentId: string; studentName: string; since: string } | null
    /** What the parent filed on their Progress Tracker, for the academic team. */
    studentInfo: (StudentInfo & { submittedAt: string }) | null
    documents: ParentDocument[]
}
export type StudentOption = { id: string; name: string; email: string; linked: boolean; parentEmail: string | null }
export type Suggestion = { parentId: string; parentName: string; parentEmail: string; studentId: string; studentName: string }
export type MissingAccount = { studentId: string; studentName: string; parentEmail: string }

type CreatePrefill = { email: string; childFirstName: string; studentId: string }

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'

/** 12 characters with at least one upper, lower and digit (the action's rule). */
function generatePassword(): string {
    const pick = (alphabet: string) => alphabet[crypto.getRandomValues(new Uint32Array(1))[0] % alphabet.length]
    const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)]
    while (chars.length < 12) chars.push(pick(UPPER + LOWER + DIGITS))
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
        ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    return chars.join('')
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || ''

export function ParentsClient({
    parents,
    students,
    suggestions,
    missing,
}: {
    parents: ParentRow[]
    students: StudentOption[]
    suggestions: Suggestion[]
    missing: MissingAccount[]
}) {
    const [search, setSearch] = useState('')
    const [create, setCreate] = useState<CreatePrefill | null>(null)
    const [linking, setLinking] = useState<ParentRow | null>(null)
    const [naming, setNaming] = useState<ParentRow | null>(null)
    const [viewing, setViewing] = useState<ParentRow | null>(null)
    const [pending, startTransition] = useTransition()

    const term = search.trim().toLowerCase()
    const shown = term
        ? parents.filter((p) =>
              [p.name, p.email, p.childFirstName, p.link?.studentName].some((v) => v?.toLowerCase().includes(term))
          )
        : parents
    const unlinkedStudents = students.filter((s) => !s.linked)

    const run = (work: () => Promise<{ error: string } | { success: true; warning?: string }>, done: string) =>
        startTransition(async () => {
            const result = await work()
            if ('error' in result) toast.error(result.error)
            else if (result.warning) toast.warning(result.warning)
            else toast.success(done)
        })

    const unlink = async (p: ParentRow) => {
        const ok = await confirmDialog({
            title: `Unlink ${p.name}?`,
            description: `${p.name} will no longer see ${p.link?.studentName ?? 'the student'}'s sessions, reports or recordings. The account stays and can be linked again.`,
            confirmLabel: 'Unlink',
            destructive: true,
        })
        if (ok) run(() => unlinkParent(p.id), 'Unlinked')
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-12">
            <PageHeader
                title="Parents"
                description="Parent accounts are view-only: they see their own child's sessions, reports, recordings and progress, and can ask for more hours."
                actions={
                    <Button onClick={() => setCreate({ email: '', childFirstName: '', studentId: '' })}>
                        <Plus />
                        Create parent
                    </Button>
                }
            />

            {(suggestions.length > 0 || missing.length > 0) && (
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Suggestions</CardTitle>
                            <CardDescription>Based on the parent email saved on each student&rsquo;s profile. Nothing is linked until you confirm.</CardDescription>
                        </div>
                    </CardHeader>
                    <ul className="divide-y divide-border border-t border-border">
                        {suggestions.map((s) => (
                            <li key={`${s.parentId}:${s.studentId}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                                <div className="min-w-0 flex-1 text-sm">
                                    <p className="font-medium text-pretty">
                                        Link {s.parentName} to {s.studentName}
                                    </p>
                                    <p className="text-muted-foreground">{s.parentEmail} is the parent email on {s.studentName}&rsquo;s profile.</p>
                                </div>
                                <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => linkParent(s.parentId, s.studentId), `Linked to ${s.studentName}`)}>
                                    <LinkIcon />
                                    Link
                                </Button>
                            </li>
                        ))}
                        {missing.map((m) => (
                            <li key={m.studentId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                                <div className="min-w-0 flex-1 text-sm">
                                    <p className="font-medium text-pretty">{m.studentName}&rsquo;s parent has no account yet</p>
                                    <p className="text-muted-foreground">Parent email on file: {m.parentEmail}</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setCreate({ email: m.parentEmail, childFirstName: firstName(m.studentName), studentId: m.studentId })}
                                >
                                    <Plus />
                                    Create
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                        <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parents or children" aria-label="Search parents" className="pl-10 in-data-[density=compact]:pl-10" />
                    </div>
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {shown.length} {shown.length === 1 ? 'parent' : 'parents'}
                    </p>
                </CardContent>
            </Card>

            <Card>
                {shown.length === 0 ? (
                    <EmptyState
                        icon={UsersThree}
                        title={parents.length ? 'No parents match that search' : 'No parent accounts yet'}
                        description={parents.length ? 'Try a name or email.' : 'Create one, with or without the student account.'}
                    />
                ) : (
                    <ul className="divide-y divide-border">
                        {shown.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                                <Avatar name={p.name} />
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium">{p.name}</p>
                                    <p className="truncate text-sm text-muted-foreground">{p.email}</p>
                                </div>
                                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:w-64">
                                    {p.link ? (
                                        <Badge tone="green">
                                            <LinkIcon weight="bold" />
                                            {p.link.studentName}
                                        </Badge>
                                    ) : (
                                        <>
                                            <Badge tone="amber">Not linked</Badge>
                                            <span className="truncate text-sm text-muted-foreground">
                                                {p.childFirstName ? `Child: ${p.childFirstName}` : 'No child name'}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    {(p.studentInfo || p.documents.length > 0) && (
                                        <Button size="sm" variant="ghost" onClick={() => setViewing(p)}>
                                            <UserList />
                                            Student info
                                            {p.documents.length > 0 && <Badge tone="neutral">{p.documents.length}</Badge>}
                                        </Button>
                                    )}
                                    {p.link ? (
                                        <Button size="sm" variant="destructive-ghost" disabled={pending} onClick={() => unlink(p)}>
                                            <LinkBreak />
                                            Unlink
                                        </Button>
                                    ) : (
                                        <>
                                            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setNaming(p)} aria-label={`Edit child's name for ${p.name}`}>
                                                <PencilSimple />
                                                Name
                                            </Button>
                                            <Button size="sm" variant="secondary" disabled={pending || unlinkedStudents.length === 0} onClick={() => setLinking(p)}>
                                                <LinkIcon />
                                                Link
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {create && <CreateParentDialog prefill={create} students={unlinkedStudents} onClose={() => setCreate(null)} />}
            {linking && (
                <LinkDialog
                    parent={linking}
                    students={unlinkedStudents}
                    pending={pending}
                    onClose={() => setLinking(null)}
                    onLink={(studentId, studentName) => {
                        setLinking(null)
                        run(() => linkParent(linking.id, studentId), `Linked to ${studentName}`)
                    }}
                />
            )}
            {viewing && <StudentInfoDialog parent={viewing} onClose={() => setViewing(null)} />}
            {naming && (
                <ChildNameDialog
                    parent={naming}
                    pending={pending}
                    onClose={() => setNaming(null)}
                    onSave={(name) => {
                        setNaming(null)
                        run(() => updateChildName(naming.id, name), "Child's name saved")
                    }}
                />
            )}
        </div>
    )
}

function CreateParentDialog({ prefill, students, onClose }: { prefill: CreatePrefill; students: StudentOption[]; onClose: () => void }) {
    const [password, setPassword] = useState(generatePassword)
    const [childName, setChildName] = useState(prefill.childFirstName)
    const [studentId, setStudentId] = useState(prefill.studentId)
    const [error, setError] = useState<string | null>(null)
    const [manualPassword, setManualPassword] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        const form = new FormData(e.currentTarget)
        form.set('password', password)
        form.set('student_id', studentId)
        startTransition(async () => {
            const result = await createParentAccount(form)
            if ('error' in result) {
                setError(result.error)
                return
            }
            if (!result.emailSent) {
                // Keep the dialog open so the password can be copied and sent by hand.
                setManualPassword(password)
                return
            }
            if (result.warning) toast.warning(result.warning)
            else toast.success('Parent account created. Welcome email sent with login details.')
            onClose()
        })
    }

    return (
        <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
            <DialogContent size="lg">
                <DialogHeader>
                    <DialogTitle>Create parent account</DialogTitle>
                    <DialogDescription>The student account doesn&rsquo;t need to exist yet. You can link them later.</DialogDescription>
                </DialogHeader>
                {manualPassword ? (
                    <>
                        <DialogBody className="space-y-3">
                            <p className="text-sm text-pretty">
                                The account was created, but the welcome email could not be sent. Copy the password now and send it to the parent yourself.
                            </p>
                            <Input readOnly value={manualPassword} aria-label="Password" className="font-mono" onFocus={(e) => e.currentTarget.select()} />
                        </DialogBody>
                        <DialogFooter>
                            <Button onClick={onClose}>Done</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <form onSubmit={submit}>
                        <DialogBody className="space-y-4">
                            <Field label="Parent's full name" htmlFor="p-name">
                                <Input id="p-name" name="full_name" required minLength={2} maxLength={100} autoComplete="off" />
                            </Field>
                            <Field label="Parent's email" htmlFor="p-email">
                                <Input id="p-email" name="email" type="email" required defaultValue={prefill.email} autoComplete="off" />
                            </Field>
                            <Field label="Password" htmlFor="p-password" help="Sent in the welcome email. The parent should change it after logging in.">
                                <div className="flex gap-2">
                                    <Input id="p-password" value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" autoComplete="new-password" />
                                    <Button type="button" variant="secondary" size="icon" aria-label="Generate a new password" onClick={() => setPassword(generatePassword())}>
                                        <ArrowsClockwise />
                                    </Button>
                                </div>
                            </Field>
                            <Field
                                label="Child's first name"
                                htmlFor="p-child"
                                optional
                                help={`Until linked, the parent sees "${childName.trim() ? `${childName.trim()}'s` : "Your child's"} portal is being set up".`}
                            >
                                <Input id="p-child" name="child_first_name" maxLength={60} value={childName} onChange={(e) => setChildName(e.target.value)} autoComplete="off" />
                            </Field>
                            <Field label="Link to student" htmlFor="p-student" optional help={students.length ? 'Only students without a parent are listed.' : 'Every student already has a parent linked.'}>
                                <SelectField id="p-student" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={students.length === 0}>
                                    <option value="">Not yet</option>
                                    {students.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                            {s.email ? ` (${s.email})` : ''}
                                        </option>
                                    ))}
                                </SelectField>
                            </Field>
                            {error && (
                                <p role="alert" className="text-sm text-destructive text-pretty">
                                    {error}
                                </p>
                            )}
                        </DialogBody>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={pending}>
                                Create parent
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}

function LinkDialog({
    parent,
    students,
    pending,
    onClose,
    onLink,
}: {
    parent: ParentRow
    students: StudentOption[]
    pending: boolean
    onClose: () => void
    onLink: (studentId: string, studentName: string) => void
}) {
    const match = students.find((s) => s.parentEmail && s.parentEmail === parent.email.toLowerCase())
    const [studentId, setStudentId] = useState(match?.id ?? students[0]?.id ?? '')
    const student = students.find((s) => s.id === studentId)

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Link {parent.name}</DialogTitle>
                    <DialogDescription>
                        {parent.name} will see this student&rsquo;s sessions, reports, recordings and progress, read-only.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Field label="Student" htmlFor="l-student" help={match ? `${match.name}'s profile lists ${parent.email} as the parent email.` : undefined}>
                        <SelectField id="l-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                            {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                    {s.email ? ` (${s.email})` : ''}
                                </option>
                            ))}
                        </SelectField>
                    </Field>
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button disabled={!student || pending} onClick={() => student && onLink(student.id, student.name)}>
                        <LinkIcon />
                        Link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ChildNameDialog({
    parent,
    pending,
    onClose,
    onSave,
}: {
    parent: ParentRow
    pending: boolean
    onClose: () => void
    onSave: (name: string) => void
}) {
    const [name, setName] = useState(parent.childFirstName ?? '')
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent size="sm">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        onSave(name)
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Child&rsquo;s first name</DialogTitle>
                        <DialogDescription>Shown to {parent.name} until the accounts are linked. Leave empty for &ldquo;your child&rdquo;.</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        <Field label="First name" htmlFor="c-name" optional>
                            <Input id="c-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="off" />
                        </Field>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending}>
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

/** What a parent told us about their child, and their documents (opened through short-lived links). */
function StudentInfoDialog({ parent, onClose }: { parent: ParentRow; onClose: () => void }) {
    const info = parent.studentInfo
    const rows: [string, string][] = info
        ? [
              ['Name', [info.childFirstName, info.childLastName].filter(Boolean).join(' ')],
              ['School', info.school],
              ['Year group', info.yearGroup],
              ['Subjects', info.subjects],
              ['Course of interest', info.courseInterest],
              ['University', UNIVERSITY_PREFERENCES.find((u) => u.value === info.universityPreference)?.label ?? ''],
              ['Notes', info.notes],
          ]
        : []
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent size="lg">
                <DialogHeader>
                    <DialogTitle>Student information from {parent.name}</DialogTitle>
                    <DialogDescription>
                        {info ? `Last updated ${new Date(info.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.` : 'No details filled in yet.'}
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-5">
                    {info && (
                        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                            {rows.map(([label, value]) => (
                                <div key={label} className={label === 'Notes' ? 'sm:col-span-2' : undefined}>
                                    <dt className="text-xs text-muted-foreground">{label}</dt>
                                    <dd className="mt-0.5 whitespace-pre-line text-pretty [overflow-wrap:anywhere]">{value || '—'}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    <div>
                        <p className="text-sm font-medium">Documents</p>
                        {parent.documents.length ? (
                            <ul className="mt-2 divide-y divide-border rounded-control border border-border">
                                {parent.documents.map((d) => (
                                    <li key={d.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                                        <a href={`/api/parent/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium underline-offset-4 hover:underline">
                                            {d.fileName}
                                        </a>
                                        <span className="shrink-0 text-muted-foreground tabular-nums">{formatBytes(d.sizeBytes)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-1 text-sm text-muted-foreground">No documents uploaded.</p>
                        )}
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
