'use client'

import { useState, useTransition } from 'react'
import { ArrowsClockwise, CheckCircle, Key, UserPlus } from '@phosphor-icons/react/ssr'
import { createParentAccount } from '@/app/dashboard/admin/parents/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'

function pick(alphabet: string): string {
    return alphabet[crypto.getRandomValues(new Uint32Array(1))[0] % alphabet.length]
}

function generatePassword(): string {
    const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)]
    while (chars.length < 12) chars.push(pick(UPPER + LOWER + DIGITS))
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
        ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    return chars.join('')
}

export function SalesParentAccountForm() {
    const [formKey, setFormKey] = useState(0)
    const [password, setPassword] = useState(generatePassword)
    const [feedback, setFeedback] = useState<{ kind: 'success' | 'warning' | 'error'; message: string } | null>(null)
    const [pending, startTransition] = useTransition()

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFeedback(null)
        const form = new FormData(event.currentTarget)
        form.set('password', password)
        startTransition(async () => {
            const result = await createParentAccount(form)
            if ('error' in result) {
                setFeedback({ kind: 'error', message: result.error })
                return
            }
            if (!result.emailSent) {
                setFeedback({
                    kind: 'warning',
                    message: `The parent account was created, but the welcome email could not be sent. Copy this password now and send it securely: ${password}`,
                })
                return
            }
            setFeedback({ kind: 'success', message: 'Parent account created. The welcome email has been sent with login details.' })
            setFormKey((key) => key + 1)
            setPassword(generatePassword())
        })
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-12">
            <PageHeader
                title="Parent Accounts"
                description="Create a parent portal account and send their login details. Student accounts are linked separately by an administrator."
            />

            <Card>
                <CardHeader>
                    <div className="flex size-11 items-center justify-center rounded-card bg-tint-blue text-tint-blue-foreground">
                        <UserPlus className="size-5" weight="bold" />
                    </div>
                    <div>
                        <CardTitle>Create parent account</CardTitle>
                        <CardDescription>Enter the parent&rsquo;s details. The child&rsquo;s first name is optional.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form key={formKey} onSubmit={submit} className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Parent's full name" htmlFor="sales-parent-name">
                                <Input id="sales-parent-name" name="full_name" required minLength={2} maxLength={100} autoComplete="off" />
                            </Field>
                            <Field label="Parent's email" htmlFor="sales-parent-email">
                                <Input id="sales-parent-email" name="email" type="email" required autoComplete="off" />
                            </Field>
                        </div>
                        <Field
                            label="Child's first name"
                            htmlFor="sales-child-name"
                            optional
                            help="Used to personalise the parent portal until an administrator links the student account."
                        >
                            <Input id="sales-child-name" name="child_first_name" maxLength={60} autoComplete="off" />
                        </Field>
                        <Field
                            label="Temporary password"
                            htmlFor="sales-parent-password"
                            help="Sent in the welcome email. The parent should change it after logging in."
                        >
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Key className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="sales-parent-password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        minLength={12}
                                        maxLength={128}
                                        required
                                        autoComplete="new-password"
                                        className="pl-10 font-mono in-data-[density=compact]:pl-10"
                                    />
                                </div>
                                <Button type="button" variant="secondary" onClick={() => setPassword(generatePassword())}>
                                    <ArrowsClockwise />
                                    Generate
                                </Button>
                            </div>
                        </Field>

                        {feedback && (
                            <div
                                role={feedback.kind === 'error' ? 'alert' : 'status'}
                                className={
                                    feedback.kind === 'success'
                                        ? 'flex items-start gap-3 rounded-card border border-border bg-tint-green p-4 text-sm text-tint-green-foreground'
                                        : feedback.kind === 'warning'
                                          ? 'rounded-card border border-border bg-tint-amber p-4 text-sm text-tint-amber-foreground'
                                          : 'rounded-card border border-border bg-tint-rose p-4 text-sm text-tint-rose-foreground'
                                }
                            >
                                {feedback.kind === 'success' && <CheckCircle className="mt-0.5 size-5 shrink-0" weight="bold" />}
                                <span className="text-pretty [overflow-wrap:anywhere]">{feedback.message}</span>
                            </div>
                        )}

                        <div className="flex justify-end border-t border-border pt-5">
                            <Button type="submit" loading={pending}>
                                <UserPlus />
                                Create parent account
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
