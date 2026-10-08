'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, CircleNotch as Loader2, ChatCircle as MessageCircle, MagnifyingGlass as Search, NotePencil as SquarePen, Users, X } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import {
    createGroupThread,
    ensureClaireThread,
    getAssignedMentorsForStudent,
    searchMessageRecipients,
    type ClaireThread,
    type GroupThread,
    type MessageRecipient,
} from './actions'

interface ExistingThread {
    id: string
    type?: 'mentor' | 'support' | 'mentor_support' | 'group'
    student_id: string | null
    mentor_id: string | null
}

interface ComposeDialogProps {
    onClose: () => void
    conversations: ExistingThread[]
    onOpened: (thread: ClaireThread, recipient: MessageRecipient) => void
    onGroupOpened: (thread: GroupThread) => void
}

function existingClaireThread(
    conversations: ExistingThread[],
    recipient: MessageRecipient
): ExistingThread | undefined {
    if (recipient.role === 'student') {
        return conversations.find(
            (c) => c.type === 'support' && c.student_id === recipient.id
        )
    }
    return conversations.find(
        (c) => c.type === 'mentor_support' && c.mentor_id === recipient.id
    )
}

export default function ComposeDialog({
    onClose,
    conversations,
    onOpened,
    onGroupOpened,
}: ComposeDialogProps) {
    const [mode, setMode] = useState<'direct' | 'group'>('direct')
    const [query, setQuery] = useState('')
    const [recipients, setRecipients] = useState<MessageRecipient[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [openingId, setOpeningId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<MessageRecipient[]>([])
    const [creating, setCreating] = useState(false)
    const [suggestedMentors, setSuggestedMentors] = useState<MessageRecipient[]>([])
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
        return () => window.clearTimeout(timer)
    }, [mode])

    useEffect(() => {
        let cancelled = false
        const handle = window.setTimeout(async () => {
            setIsSearching(true)
            setError(null)
            try {
                const results = await searchMessageRecipients(query)
                if (!cancelled) setRecipients(results)
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Could not search people')
                    setRecipients([])
                }
            } finally {
                if (!cancelled) setIsSearching(false)
            }
        }, query.trim() ? 200 : 0)

        return () => {
            cancelled = true
            window.clearTimeout(handle)
        }
    }, [query])

    const selectedIds = new Set(selected.map((p) => p.id))

    useEffect(() => {
        const students = selected.filter((p) => p.role === 'student')
        if (students.length !== 1) {
            setSuggestedMentors([])
            return
        }

        let cancelled = false
        getAssignedMentorsForStudent(students[0].id)
            .then((mentors) => {
                if (cancelled) return
                setSuggestedMentors(mentors.filter((m) => !selectedIds.has(m.id)))
            })
            .catch(() => {
                if (!cancelled) setSuggestedMentors([])
            })

        return () => {
            cancelled = true
        }
        // selectedIds is derived from selected; listing selected is enough.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected])

    const handleSelectDirect = async (recipient: MessageRecipient) => {
        setOpeningId(recipient.id)
        setError(null)
        try {
            const existing = existingClaireThread(conversations, recipient)
            if (existing) {
                onOpened(
                    {
                        conversationId: existing.id,
                        adminId: '',
                        type: recipient.role === 'student' ? 'support' : 'mentor_support',
                        studentId: existing.student_id,
                        mentorId: existing.mentor_id,
                        createdAt: new Date().toISOString(),
                    },
                    recipient
                )
                onClose()
                return
            }

            const thread = await ensureClaireThread(recipient.id, recipient.role)
            onOpened(thread, recipient)
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not open conversation')
        } finally {
            setOpeningId(null)
        }
    }

    const toggleGroupMember = (recipient: MessageRecipient) => {
        setError(null)
        setSelected((prev) =>
            prev.some((p) => p.id === recipient.id)
                ? prev.filter((p) => p.id !== recipient.id)
                : [...prev, recipient]
        )
    }

    const addSuggestedMentors = () => {
        setSelected((prev) => {
            const have = new Set(prev.map((p) => p.id))
            return [...prev, ...suggestedMentors.filter((m) => !have.has(m.id))]
        })
        setSuggestedMentors([])
    }

    const studentCount = selected.filter((p) => p.role === 'student').length
    const mentorCount = selected.filter((p) => p.role === 'mentor').length
    const canCreateGroup =
        studentCount >= 1 && mentorCount >= 1 && studentCount + mentorCount >= 3

    const handleCreateGroup = async () => {
        if (!canCreateGroup || creating) return
        setCreating(true)
        setError(null)
        try {
            const thread = await createGroupThread(selected.map((p) => p.id))
            onGroupOpened(thread)
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create group')
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
                onClick={onClose}
            />

            <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-sheet bg-card sm:mx-4 sm:max-h-[min(36rem,85vh)] sm:rounded-sheet shadow-overlay animate-in fade-in-0 zoom-in-96 duration-200 ease-snappy motion-reduce:animate-none">
                <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-foreground">
                            {mode === 'group' ? 'New group' : 'New message'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {mode === 'group'
                                ? 'Claire is always in the group'
                                : 'Sends as Claire Marlowe · Access Oxbridge'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-2 hover:bg-muted rounded-full transition-colors shrink-0"
                    >
                        <X className="size-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="px-6 pt-3">
                    <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-control">
                        <button
                            type="button"
                            onClick={() => {
                                setMode('direct')
                                setError(null)
                            }}
                            className={cn(
                                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                                mode === 'direct'
                                    ? 'bg-card text-foreground shadow-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Message one person
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMode('group')
                                setError(null)
                            }}
                            className={cn(
                                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                                mode === 'group'
                                    ? 'bg-card text-foreground shadow-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            New group
                        </button>
                    </div>
                </div>

                {mode === 'group' && selected.length > 0 && (
                    <div className="px-6 pt-3 flex flex-wrap gap-1.5">
                        {selected.map((person) => (
                            <span
                                key={person.id}
                                className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-muted text-xs font-medium text-foreground"
                            >
                                {person.full_name || (person.role === 'student' ? 'Student' : 'Mentor')}
                                <button
                                    type="button"
                                    onClick={() => toggleGroupMember(person)}
                                    aria-label={`Remove ${person.full_name || 'person'}`}
                                    className="p-0.5 rounded-full hover:bg-muted"
                                >
                                    <X className="size-3 text-muted-foreground" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {mode === 'group' && suggestedMentors.length >= 2 && (
                    <div className="px-6 pt-3">
                        <button
                            type="button"
                            onClick={addSuggestedMentors}
                            className="w-full text-left px-3 py-2 rounded-control bg-primary/[0.06] border border-primary/20 text-xs text-foreground hover:bg-primary/10 transition-colors"
                        >
                            <span className="font-semibold text-primary">Add their mentors</span>
                            <span className="text-muted-foreground">
                                {' '}
                                · {suggestedMentors.map((m) => m.full_name || 'Mentor').join(', ')}
                            </span>
                        </button>
                    </div>
                )}

                <div className="px-6 py-3 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search students or mentors…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 pe-3.5 pl-10"
                        />
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    {error && (
                        <p className="px-6 py-3 text-sm text-destructive">{error}</p>
                    )}

                    {isSearching && recipients.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="size-5 text-primary animate-spin" />
                        </div>
                    ) : recipients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Users className="size-12 mb-3 text-muted-foreground/60" />
                            <p className="text-sm font-medium">
                                {query.trim() ? 'No matches found' : 'No people to message yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {recipients.map((recipient) => {
                                const existing = existingClaireThread(conversations, recipient)
                                const isOpening = openingId === recipient.id
                                const isPicked = selectedIds.has(recipient.id)
                                return (
                                    <button
                                        key={recipient.id}
                                        type="button"
                                        onClick={() =>
                                            mode === 'group'
                                                ? toggleGroupMember(recipient)
                                                : handleSelectDirect(recipient)
                                        }
                                        disabled={mode === 'direct' && openingId !== null}
                                        className="w-full px-6 py-3.5 flex items-center gap-3 hover:bg-muted/60 transition-colors text-left disabled:opacity-50"
                                    >
                                        {recipient.photo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={recipient.photo_url}
                                                alt=""
                                                className="size-11 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="size-11 rounded-full bg-primary flex items-center justify-center text-white font-semibold shrink-0">
                                                {recipient.full_name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-sm text-foreground truncate">
                                                    {recipient.full_name || (recipient.role === 'student' ? 'Student' : 'Mentor')}
                                                </p>
                                                <span
                                                    className={cn(
                                                        'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                                                        recipient.role === 'student'
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'bg-rich-green-accent/10 text-rich-green-accent'
                                                    )}
                                                >
                                                    {recipient.role === 'student' ? 'Student' : 'Mentor'}
                                                </span>
                                            </div>
                                            {recipient.email && (
                                                <p className="text-xs text-muted-foreground truncate">{recipient.email}</p>
                                            )}
                                            {mode === 'direct' && existing && (
                                                <p className="text-xs text-success font-medium">
                                                    Existing conversation
                                                </p>
                                            )}
                                        </div>

                                        {mode === 'group' ? (
                                            <span
                                                className={cn(
                                                    'size-5 rounded-full border flex items-center justify-center shrink-0',
                                                    isPicked
                                                        ? 'bg-primary border-primary text-white'
                                                        : 'border-border text-transparent'
                                                )}
                                            >
                                                <Check className="size-3" />
                                            </span>
                                        ) : isOpening ? (
                                            <Loader2 className="size-5 text-primary animate-spin shrink-0" />
                                        ) : (
                                            <MessageCircle
                                                className={cn(
                                                    'size-5 shrink-0',
                                                    existing ? 'text-success' : 'text-muted-foreground/60'
                                                )}
                                            />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {mode === 'group' && (
                    <div className="px-6 py-3 border-t border-border">
                        <button
                            type="button"
                            onClick={handleCreateGroup}
                            disabled={!canCreateGroup || creating}
                            className="w-full py-2.5 rounded-control bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:hover:bg-primary"
                        >
                            {creating ? (
                                <Loader2 className="size-4 mx-auto animate-spin" />
                            ) : canCreateGroup ? (
                                `Create group · ${selected.length} people`
                            ) : (
                                'Need one student, one mentor, and three people in total'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export function ComposeButton({
    onClick,
    className,
}: {
    onClick: () => void
    className?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="New message"
            title="New message"
            className={cn(
                'p-2.5 rounded-control border border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.06] transition-colors shrink-0',
                className
            )}
        >
            <SquarePen className="size-4" />
        </button>
    )
}
