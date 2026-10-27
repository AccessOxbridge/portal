'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlass, ShieldCheck } from '@phosphor-icons/react/ssr'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { confirmDialog } from '@/components/ui/confirm'
import { setAccountEnabled } from '@/app/dashboard/account-access-actions'

type Account = {
    id: string
    full_name: string | null
    email: string | null
    role: string
    disabledAt: string | null
}
const defaultRoles = [
    ['student', 'Students'],
    ['mentor', 'Mentors'],
    ['parent', 'Parents'],
    ['sales', 'Sales'],
    ['admin', 'Admins'],
] as const

export function AccountsClient({
    accounts,
    currentUserId,
    roleOptions = defaultRoles,
    footerNote = 'Mentors with outstanding invoices, unresolved payouts or unbilled sessions must settle these first. Historical sessions, reports and financial records remain available.',
}: {
    accounts: Account[]
    currentUserId: string
    roleOptions?: ReadonlyArray<readonly [string, string]>
    footerNote?: string
}) {
    const router = useRouter()
    const [role, setRole] = useState(roleOptions[0]?.[0] ?? 'parent')
    const [view, setView] = useState('active')
    const [search, setSearch] = useState('')
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const [page, setPage] = useState(1)
    const roleAccounts = accounts.filter((account) =>
        role === 'admin'
            ? ['admin', 'admin-dev'].includes(account.role)
            : account.role === role,
    )
    const matching = roleAccounts.filter(
        (account) =>
            (view === 'disabled') === !!account.disabledAt &&
            `${account.full_name || ''} ${account.email || ''}`
                .toLowerCase()
                .includes(search.toLowerCase()),
    )
    const totalPages = Math.max(1, Math.ceil(matching.length / 15))
    const currentPage = Math.min(page, totalPages)
    const rows = matching.slice((currentPage - 1) * 15, currentPage * 15)

    async function changeAccess(account: Account) {
        const enabled = !!account.disabledAt
        const name = account.full_name || account.email || 'this account'
        if (
            !(await confirmDialog({
                title: `${enabled ? 'Re-enable' : 'Disable'} ${name}?`,
                description: enabled
                    ? 'They will be able to use the portal again.'
                    : 'They will lose portal access and move to the Disabled list. Their historical records will be kept. Review and reassign any upcoming sessions before continuing.',
                confirmLabel: enabled ? 'Re-enable account' : 'Disable account',
                destructive: !enabled,
            }))
        )
            return
        setPendingId(account.id)
        startTransition(async () => {
            try {
                const result = await setAccountEnabled(account.id, enabled)
                if (result.error) toast.error(result.error)
                else {
                    toast.success(
                        `${name} has been ${enabled ? 're-enabled' : 'disabled'}.`,
                    )
                    router.refresh()
                }
            } catch {
                toast.error(
                    'Account access could not be changed. Please try again.',
                )
            } finally {
                setPendingId(null)
            }
        })
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-10">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Disable Account
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Manage who can access the portal. Disabled accounts are kept
                    here and can be re-enabled at any time.
                </p>
            </header>
            <Tabs
                value={role}
                onValueChange={(value) => {
                    setRole(value)
                    setPage(1)
                }}
            >
                <TabsList aria-label="Account type">
                    {roleOptions.map(([value, label]) => (
                        <TabsTrigger key={value} value={value}>
                            {label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value={role}>
                    <section
                        aria-label={`${role} accounts`}
                        className="overflow-hidden rounded-card border border-transparent bg-card shadow-border"
                    >
                        <Tabs
                            value={view}
                            onValueChange={(value) => {
                                setView(value)
                                setPage(1)
                            }}
                            className="gap-0"
                        >
                            <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                                <TabsList aria-label="Account status">
                                    <TabsTrigger value="active">
                                        Active (
                                        {
                                            roleAccounts.filter(
                                                (a) => !a.disabledAt,
                                            ).length
                                        }
                                        )
                                    </TabsTrigger>
                                    <TabsTrigger value="disabled">
                                        Disabled (
                                        {
                                            roleAccounts.filter(
                                                (a) => !!a.disabledAt,
                                            ).length
                                        }
                                        )
                                    </TabsTrigger>
                                </TabsList>
                                <div className="relative sm:w-72">
                                    <MagnifyingGlass
                                        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden
                                    />
                                    <Input
                                        aria-label="Search accounts by name or email"
                                        placeholder="Search by name or email"
                                        value={search}
                                        onChange={(event) => {
                                            setSearch(event.target.value)
                                            setPage(1)
                                        }}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <TabsContent value={view}>
                                {rows.length ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                                                <tr>
                                                    <th className="px-5 py-4 font-medium">
                                                        Account
                                                    </th>
                                                    <th className="hidden px-5 py-4 font-medium sm:table-cell">
                                                        Status
                                                    </th>
                                                    <th className="px-5 py-4 text-right font-medium">
                                                        Action
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {rows.map((account) => (
                                                    <tr key={account.id}>
                                                        <td className="px-5 py-4">
                                                            <p className="font-medium">
                                                                {account.full_name ||
                                                                    'Unnamed account'}
                                                                {account.id ===
                                                                    currentUserId && (
                                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="mt-1 break-all text-muted-foreground">
                                                                {account.email}
                                                            </p>
                                                            <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                                                                <Badge
                                                                    tone={
                                                                        account.disabledAt
                                                                            ? 'neutral'
                                                                            : 'green'
                                                                    }
                                                                >
                                                                    {account.disabledAt
                                                                        ? 'Disabled'
                                                                        : 'Active'}
                                                                </Badge>
                                                                {account.disabledAt && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {new Intl.DateTimeFormat(
                                                                            'en-GB',
                                                                            {
                                                                                dateStyle:
                                                                                    'medium',
                                                                                timeZone:
                                                                                    'Europe/London',
                                                                            },
                                                                        ).format(
                                                                            new Date(
                                                                                account.disabledAt,
                                                                            ),
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {account.role ===
                                                                'admin-dev' && (
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    Admin
                                                                    developer
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="hidden px-5 py-4 sm:table-cell">
                                                            <Badge
                                                                tone={
                                                                    account.disabledAt
                                                                        ? 'neutral'
                                                                        : 'green'
                                                                }
                                                            >
                                                                {account.disabledAt
                                                                    ? 'Disabled'
                                                                    : 'Active'}
                                                            </Badge>
                                                            {account.disabledAt && (
                                                                <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                                                                    {new Intl.DateTimeFormat(
                                                                        'en-GB',
                                                                        {
                                                                            dateStyle:
                                                                                'medium',
                                                                            timeZone:
                                                                                'Europe/London',
                                                                        },
                                                                    ).format(
                                                                        new Date(
                                                                            account.disabledAt,
                                                                        ),
                                                                    )}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <Button
                                                                size="sm"
                                                                variant={
                                                                    account.disabledAt
                                                                        ? 'secondary'
                                                                        : 'outline'
                                                                }
                                                                disabled={
                                                                    pending ||
                                                                    account.id ===
                                                                        currentUserId
                                                                }
                                                                loading={
                                                                    pending &&
                                                                    pendingId ===
                                                                        account.id
                                                                }
                                                                onClick={() =>
                                                                    changeAccess(
                                                                        account,
                                                                    )
                                                                }
                                                            >
                                                                {account.disabledAt
                                                                    ? 'Re-enable'
                                                                    : 'Disable'}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="px-5 py-16 text-center">
                                        <ShieldCheck
                                            aria-hidden
                                            className="mx-auto mb-3 size-9 text-muted-foreground"
                                        />
                                        <h2 className="font-semibold">
                                            No{' '}
                                            {view === 'disabled'
                                                ? 'disabled '
                                                : ''}
                                            accounts found
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {search
                                                ? 'Try a different name or email address.'
                                                : 'Accounts will appear here when available.'}
                                        </p>
                                    </div>
                                )}
                                <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground">
                                    <span>
                                        {matching.length} account
                                        {matching.length === 1 ? '' : 's'} ·
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={currentPage === 1}
                                            onClick={() =>
                                                setPage(currentPage - 1)
                                            }
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={
                                                currentPage === totalPages
                                            }
                                            onClick={() =>
                                                setPage(currentPage + 1)
                                            }
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </section>
                </TabsContent>
            </Tabs>
            {footerNote && <p className="text-xs leading-relaxed text-muted-foreground">{footerNote}</p>}
        </div>
    )
}
