'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState, useTransition } from 'react'
import {
    Search,
    Users,
    Loader2,
    Plus,
    X,
    UserPlus,
    Mail,
    User,
    CheckCircle2,
    AlertCircle,
    Shield
} from 'lucide-react'
import { registerPremiumClient } from './actions'

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
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Premium Clients</h1>
                    <p className="text-gray-500 mt-1">Manage and register your one-to-one premium clients.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                >
                    <Plus className="w-5 h-5" />
                    Register Premium Client
                </button>
            </header>

            {/* Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLoading ? 'text-accent animate-pulse' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all shadow-inner"
                    />
                </div>
                <div className="text-sm text-gray-400 font-medium">
                    {clients.length} {clients.length === 1 ? 'Client' : 'Clients'} found
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                {isLoading && clients.length === 0 ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Users className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No premium clients yet</h3>
                        <p className="text-gray-500 max-w-sm">
                            {searchTerm ? `No clients matching "${searchTerm}"` : 'Get started by registering your first premium client manually.'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="mt-6 text-accent font-semibold hover:underline"
                            >
                                Register your first client
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Client Details</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Registration Date</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {clients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                    {client.full_name?.[0] || 'C'}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-gray-900 truncate text-base">{client.full_name || 'Anonymous Client'}</span>
                                                    <span className="text-sm text-gray-400 truncate flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        {client.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        {/* <td className="px-8 py-5 text-sm text-gray-500 font-medium">
                                            {format(new Date(client.created_at), 'MMMM dd, yyyy')}
                                        </td> */}
                                        <td className="px-8 py-5">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold ring-1 ring-inset ring-green-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="text-gray-400 hover:text-gray-600 font-medium text-sm transition-colors">
                                                View Account
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative border border-white/20">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-10">
                            <div className="mb-8">
                                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                                    <UserPlus className="w-7 h-7 text-accent" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Register Premium Client</h2>
                                <p className="text-gray-500 mt-2">A welcome email with login details will be sent automatically.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            required
                                            name="full_name"
                                            type="text"
                                            placeholder="Jane Doe"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Role</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            name="role"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="client">Premium Client</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            required
                                            name="email"
                                            type="email"
                                            placeholder="jane@example.com"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all"
                                        />
                                    </div>
                                </div>

                                {message && (
                                    <div className={`flex items-start gap-3 p-4 rounded-2xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'} animate-in slide-in-from-top-2`}>
                                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                        <span className="text-sm font-medium">{message.text}</span>
                                    </div>
                                )}

                                <button
                                    disabled={isPending}
                                    type="submit"
                                    className="w-full py-4 bg-accent text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>Register Client</>
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
