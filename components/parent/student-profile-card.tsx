'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ImageSquare, PencilSimple, ShieldCheck, Trash, UploadSimple, UserList } from '@phosphor-icons/react/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { confirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { createClient } from '@/utils/supabase/client'
import type { ParentWords } from '@/lib/parent-words'
import {
    DOCUMENT_ACCEPT,
    DOCUMENT_TYPES,
    DOCUMENTS_BUCKET,
    MAX_DOCUMENT_BYTES,
    UNIVERSITY_PREFERENCES,
    YEAR_GROUPS,
    formatBytes,
    type ParentDocument,
    type StudentInfo,
} from '@/lib/parent-student-info'

const EMPTY: StudentInfo = {
    childFirstName: '',
    childLastName: '',
    school: '',
    yearGroup: '',
    subjects: '',
    courseInterest: '',
    universityPreference: '',
    notes: '',
}

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * "Student profile" on the Progress Tracker: what the parent tells us about
 * their child, and documents for the academic team. Saving and uploading go
 * through /api/parent/student-info and /api/parent/documents; files go
 * straight to private storage through a one-off signed upload URL.
 */
export function StudentProfileCard({ info, documents, words: w }: { info: StudentInfo | null; documents: ParentDocument[]; words: ParentWords }) {
    const router = useRouter()
    const [editing, setEditing] = useState(false)
    const [docs, setDocs] = useState(documents)
    const [uploading, setUploading] = useState<string[]>([])
    const fileInput = useRef<HTMLInputElement>(null)

    const upload = async (files: FileList | null) => {
        if (!files?.length) return
        const supabase = createClient()
        for (const file of Array.from(files)) {
            if (!DOCUMENT_TYPES[file.type]) {
                toast.error(`${file.name}: please upload a PDF, Word document or image`)
                continue
            }
            if (file.size > MAX_DOCUMENT_BYTES) {
                toast.error(`${file.name} is over 10 MB`)
                continue
            }
            setUploading((u) => [...u, file.name])
            try {
                const start = await post({ step: 'start', fileName: file.name, mimeType: file.type, size: file.size })
                const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).uploadToSignedUrl(start.path, start.token, file, { contentType: file.type })
                if (error) throw new Error('The upload did not finish')
                const done = await post({ step: 'finish', path: start.path, fileName: file.name })
                setDocs((d) => [done.document, ...d])
            } catch (e) {
                toast.error(e instanceof Error ? `${file.name}: ${e.message}` : `Could not upload ${file.name}`)
            } finally {
                setUploading((u) => u.filter((n) => n !== file.name))
            }
        }
        if (fileInput.current) fileInput.current.value = ''
        router.refresh()
    }

    const remove = async (doc: ParentDocument) => {
        const ok = await confirmDialog({
            title: `Remove ${doc.fileName}?`,
            description: 'The file is deleted and our academic team will no longer see it.',
            confirmLabel: 'Remove',
            destructive: true,
        })
        if (!ok) return
        const res = await fetch(`/api/parent/documents/${doc.id}`, { method: 'DELETE' })
        if (!res.ok) {
            toast.error('Could not remove the document')
            return
        }
        setDocs((d) => d.filter((x) => x.id !== doc.id))
        router.refresh()
    }

    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>{info ? `${w.Childs} profile` : 'Student profile'}</CardTitle>
                    <CardDescription>
                        Tell us about {w.child} and share anything that helps our academic team prepare for your consultation.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {info ? (
                    <div className="rounded-control bg-muted/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <dl className="grid flex-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                                <Detail label="Name" value={[info.childFirstName, info.childLastName].filter(Boolean).join(' ')} />
                                <Detail label="School" value={info.school} />
                                <Detail label="Year group" value={info.yearGroup} />
                                <Detail label="Subjects" value={info.subjects} />
                                <Detail label="Course of interest" value={info.courseInterest} />
                                <Detail label="University" value={UNIVERSITY_PREFERENCES.find((u) => u.value === info.universityPreference)?.label ?? ''} />
                            </dl>
                            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                                <PencilSimple />
                                Edit
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-control border border-dashed border-border p-4">
                        <div className="flex items-start gap-3">
                            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-foreground">
                                <UserList weight="duotone" className="size-5" />
                            </div>
                            <div>
                                <p className="font-medium">Add student information</p>
                                <p className="text-sm text-pretty text-muted-foreground">School, year group, subjects and the course {w.child} is considering.</p>
                            </div>
                        </div>
                        <Button onClick={() => setEditing(true)}>Add information</Button>
                    </div>
                )}

                <section>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h3 className="font-semibold">Documents</h3>
                            <p className="mt-0.5 max-w-xl text-sm text-pretty text-muted-foreground">
                                Please upload any documents that will help our academic team understand {w.childs} strengths. For example a
                                recent school report, predicted grades, GCSE results, a personal statement draft or admissions test results.
                            </p>
                        </div>
                        <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={uploading.length > 0}>
                            <UploadSimple />
                            Upload documents
                        </Button>
                        <input
                            ref={fileInput}
                            type="file"
                            multiple
                            accept={DOCUMENT_ACCEPT}
                            className="sr-only"
                            aria-label="Upload documents"
                            onChange={(e) => upload(e.target.files)}
                        />
                    </div>

                    {(docs.length > 0 || uploading.length > 0) && (
                        <ul className="mt-3 divide-y divide-border rounded-control border border-border">
                            {uploading.map((name) => (
                                <li key={`up:${name}`} className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground">
                                    <UploadSimple className="size-4 shrink-0 animate-pulse" />
                                    <span className="min-w-0 flex-1 truncate">{name}</span>
                                    <span>Uploading…</span>
                                </li>
                            ))}
                            {docs.map((d) => {
                                const Icon = d.mimeType.startsWith('image/') ? ImageSquare : FileText
                                return (
                                    <li key={d.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                                        <a
                                            href={`/api/parent/documents/${d.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-w-0 flex-1 truncate font-medium text-foreground underline-offset-4 hover:underline"
                                        >
                                            {d.fileName}
                                        </a>
                                        <span className="hidden shrink-0 text-muted-foreground tabular-nums sm:inline">
                                            {formatBytes(d.sizeBytes)} · {dateLabel(d.createdAt)}
                                        </span>
                                        <Button variant="destructive-ghost" size="icon-sm" onClick={() => remove(d)} aria-label={`Remove ${d.fileName}`}>
                                            <Trash />
                                        </Button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">PDF, Word or image files, up to 10 MB each.</p>
                </section>

                <div className="flex gap-3 rounded-control bg-gold-soft p-4">
                    <ShieldCheck weight="duotone" className="mt-0.5 size-5 shrink-0 text-gold-foreground" />
                    <p className="text-sm text-pretty text-foreground/90">
                        <span className="font-semibold">Your information is safe with us.</span> Everything you share is encrypted and stored
                        securely in the EU, seen only by the Access Oxbridge academic team, and used only to support {w.childs} application.
                        We handle all personal data in line with UK GDPR, never sell or share it, and will delete it whenever you ask.
                    </p>
                </div>
            </CardContent>

            {editing && (
                <StudentInfoDialog
                    initial={info ?? EMPTY}
                    onClose={() => setEditing(false)}
                    onSaved={() => {
                        setEditing(false)
                        toast.success('Student information saved')
                        router.refresh()
                    }}
                />
            )}
        </Card>
    )
}

async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/parent/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Upload failed')
    return json
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-medium text-pretty [overflow-wrap:anywhere]">{value || '—'}</dd>
        </div>
    )
}

function StudentInfoDialog({ initial, onClose, onSaved }: { initial: StudentInfo; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState(initial)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (key: keyof StudentInfo) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.childFirstName.trim()) {
            setError('Please add your child’s first name')
            return
        }
        setSaving(true)
        try {
            const res = await fetch('/api/parent/student-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            if (!res.ok) {
                toast.error((await res.json().catch(() => null))?.error || 'Could not save the details')
                return
            }
            onSaved()
        } catch {
            toast.error('Could not save the details')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
            <DialogContent size="lg">
                <form onSubmit={save}>
                    <DialogHeader>
                        <DialogTitle>Student information</DialogTitle>
                        <DialogDescription>A few details so our academic team can get to know your child before the consultation.</DialogDescription>
                    </DialogHeader>
                    <DialogBody className="grid gap-4 sm:grid-cols-2">
                        <Field label="First name" htmlFor="si-first" error={error}>
                            <Input id="si-first" value={form.childFirstName} onChange={(e) => { setError(null); set('childFirstName')(e) }} maxLength={60} autoComplete="off" required />
                        </Field>
                        <Field label="Last name" htmlFor="si-last" optional>
                            <Input id="si-last" value={form.childLastName} onChange={set('childLastName')} maxLength={60} autoComplete="off" />
                        </Field>
                        <Field label="School" htmlFor="si-school" optional>
                            <Input id="si-school" value={form.school} onChange={set('school')} maxLength={120} />
                        </Field>
                        <Field label="Year group" htmlFor="si-year" optional>
                            <SelectField id="si-year" value={form.yearGroup} onChange={set('yearGroup')}>
                                <option value="">Choose…</option>
                                {YEAR_GROUPS.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </SelectField>
                        </Field>
                        <Field label="Current subjects" htmlFor="si-subjects" optional help="For example: History, English Literature, Maths" className="sm:col-span-2">
                            <Input id="si-subjects" value={form.subjects} onChange={set('subjects')} maxLength={300} />
                        </Field>
                        <Field label="Course of interest" htmlFor="si-course" optional>
                            <Input id="si-course" value={form.courseInterest} onChange={set('courseInterest')} maxLength={120} />
                        </Field>
                        <Field label="University" htmlFor="si-uni" optional>
                            <SelectField id="si-uni" value={form.universityPreference} onChange={set('universityPreference')}>
                                <option value="">Choose…</option>
                                {UNIVERSITY_PREFERENCES.map((u) => (
                                    <option key={u.value} value={u.value}>
                                        {u.label}
                                    </option>
                                ))}
                            </SelectField>
                        </Field>
                        <Field label="Anything else we should know?" htmlFor="si-notes" optional className="sm:col-span-2">
                            <Textarea id="si-notes" value={form.notes} onChange={set('notes')} maxLength={2000} rows={3} />
                        </Field>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={saving}>
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
