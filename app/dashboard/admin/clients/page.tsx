'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState, useTransition } from 'react'
import {
    MagnifyingGlass as Search,
    Users,
    CircleNotch as Loader2,
    Plus,
    X,
    UserPlus,
    Envelope as Mail,
    User,
    CheckCircle as CheckCircle2,
    WarningCircle as AlertCircle,
    Shield,
} from '@phosphor-icons/react/ssr'
import { registerPremiumClient } from './actions'
import { SelectField } from '@/components/ui/select'

interface PremiumClient {
    id: string
    full_name: string | null
    email: string | null
    // created_at: string
}

export default function AdminClientsPage() {
    const supabase = createClient()
    const [clients, setClients] = useState<PremiumClient[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const fetchClients = async () => {
        setIsLoading(true)

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'client')
            .order('updated_at', { ascending: false })

        if (!error && data) {
            let filtered = data as PremiumClient[]
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                filtered = filtered.filter(client =>
                    client.full_name?.toLowerCase().includes(term) ||
                    client.email?.toLowerCase().includes(term)
                )
            }
            setClients(filtered)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchClients()
    }, [searchTerm])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setMessage(null)
        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            const result = await registerPremiumClient(formData)
            if (result.success) {
                setMessage({ type: 'success', text: 'Premium client registered successfully! Welcome email sent.' })
                fetchClients()
                setTimeout(() => {
                    setIsModalOpen(false)
                    setMessage(null)
                }, 2000)
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to register client' })
            }
        })
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Premium clients</h1>
                    <p className="text-muted-foreground mt-1">Manage and register your one-to-one premium clients.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                >
                    <Plus className="size-5" />
                    Register premium client
                </button>
            </header>

            {/* Search */}
            <div className="border border-transparent flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-card shadow-border">
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${isLoading ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-10"
                    />
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                    {clients.length} {clients.length === 1 ? 'client' : 'clients'} found
                </div>
            </div>

            {/* Table */}
            <div className="border border-transparent bg-card rounded-card overflow-hidden shadow-border">
                {isLoading && clients.length === 0 ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="size-8 text-primary animate-spin" />
                    </div>
                ) : clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="size-20 bg-muted/60 rounded-full flex items-center justify-center mb-6">
                            <Users className="size-10 text-muted-foreground/60" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No premium clients yet</h3>
                        <p className="text-muted-foreground max-w-sm">
                            {searchTerm ? `No clients matching "${searchTerm}"` : 'Get started by registering your first premium client manually.'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="mt-6 text-primary font-semibold hover:underline"
                            >
                                Register your first client
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/60 border-b border-border">
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground">Client details</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground">Registration date</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground">Status</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {clients.map((client) => (
                                    <tr key={client.id} className="hover:bg-muted/60 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-card bg-tint-blue text-tint-blue-foreground flex items-center justify-center font-semibold text-lg shrink-0 shadow-border group-hover:scale-105 transition-transform">
                                                    {client.full_name?.[0] || 'C'}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-foreground truncate text-base">{client.full_name || 'Anonymous Client'}</span>
                                                    <span className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                                                        <Mail className="size-3.5" />
                                                        {client.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        {/* <td className="px-8 py-5 text-sm text-muted-foreground font-medium">
                                            {format(new Date(client.created_at), 'MMMM dd, yyyy')}
                                        </td> */}
                                        <td className="px-8 py-5">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tint-green text-success text-xs font-semibold ring-1 ring-inset ring-border">
                                                <div className="size-1.5 rounded-full bg-success" />
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="text-muted-foreground hover:text-muted-foreground font-medium text-sm transition-colors">
                                                View account
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 animate-in fade-in-0 duration-200 motion-reduce:animate-none">
                    <div className="relative w-full max-w-md overflow-hidden rounded-sheet border border-transparent bg-card shadow-overlay animate-in fade-in-0 zoom-in-96 duration-200 ease-snappy motion-reduce:animate-none">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-full transition-[background-color,box-shadow,color] duration-150"
                        >
                            <X className="size-5" />
                        </button>

                        <div className="p-10">
                            <div className="mb-8">
                                <div className="size-14 bg-primary/10 rounded-card flex items-center justify-center mb-6">
                                    <UserPlus className="size-7 text-primary" />
                                </div>
                                <h2 className="text-2xl font-semibold text-foreground">Register premium client</h2>
                                <p className="text-muted-foreground mt-2">A welcome email with login details will be sent automatically.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground ml-1">Full name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <input
                                            required
                                            name="full_name"
                                            type="text"
                                            placeholder="Jane Doe"
                                            className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground ml-1">Role</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <SelectField
                                            name="role"
                                        >
                                            <option value="client">Premium client</option>
                                            <option value="admin">Admin</option>
                                        </SelectField>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground ml-1">Email address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <input
                                            required
                                            name="email"
                                            type="email"
                                            placeholder="jane@example.com"
                                            className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-11"
                                        />
                                    </div>
                                </div>

                                {message && (
                                    <div className={`flex items-start gap-3 p-4 rounded-card ${message.type === 'success' ? 'bg-tint-green text-tint-green-foreground border border-border' : 'bg-tint-rose text-tint-rose-foreground border border-border'}  `}>
                                        {message.type === 'success' ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
                                        <span className="text-sm font-medium">{message.text}</span>
                                    </div>
                                )}

                                <button
                                    disabled={isPending}
                                    type="submit"
                                    className="w-full py-4 bg-primary text-white rounded-card font-semibold text-lg hover:opacity-90 transition-[background-color,box-shadow,color] duration-150 shadow-border shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {isPending ? (
                                        <Loader2 className="size-5 animate-spin" />
                                    ) : (
                                        <>Register client</>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
