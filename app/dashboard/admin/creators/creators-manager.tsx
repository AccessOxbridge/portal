'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/components/ui/toaster'

type Creator = {
    id: string
    name: string
    email: string
    bio: string | null
    tracking_code: string
    referrals_count: number | null
    created_at: string
}

export default function CreatorsManager({ initialCreators }: { initialCreators: Creator[] }) {
    const [creators, setCreators] = useState<Creator[]>(initialCreators)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        bio: '',
        tracking_code: ''
    })

    const supabase = createClient()
    const router = useRouter()

    const generateCode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        const length = 8
        let result = ''
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length))
        }
        setFormData(prev => ({ ...prev, tracking_code: result }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { data, error } = await supabase
                .from('creators')
                .insert({
                    name: formData.name,
                    email: formData.email,
                    bio: formData.bio,
                    tracking_code: formData.tracking_code
                })
                .select()
                .single()

            if (error) throw error

            setCreators([data, ...creators])
            setIsAddModalOpen(false)
            setFormData({ name: '', email: '', bio: '', tracking_code: '' })
            router.refresh()
        } catch (error) {
            console.error('Error adding creator:', error)
            toast.error('Failed to add creator. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">All creators</h2>
                    <p className="text-sm text-muted-foreground">Manage creators and view their performance</p>
                </div>
                <button
                    onClick={() => {
                        generateCode()
                        setIsAddModalOpen(true)
                    }}
                    className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add creator
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {creators.map((creator) => (
                    <div key={creator.id} className="border border-transparent bg-card p-6 rounded-card shadow-border flex items-center justify-between hover:border-border transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-full bg-tint-violet flex items-center justify-center text-lg font-semibold text-primary">
                                {creator.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">{creator.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span>{creator.email}</span>
                                    <span className="size-1 rounded-full bg-muted"></span>
                                    <span className="font-mono bg-muted/60 px-2 py-0.5 rounded border border-border text-xs">
                                        {creator.tracking_code}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <span className="block text-2xl font-semibold text-foreground">{creator.referrals_count || 0}</span>
                                <span className="text-xs font-medium text-muted-foreground">Referrals</span>
                            </div>
                            <button className="p-2 text-muted-foreground hover:text-muted-foreground transition-colors">
                                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}

                {creators.length === 0 && (
                    <div className="text-center py-12 bg-muted/60 rounded-card border border-dashed border-border">
                        <h3 className="text-foreground font-medium mb-1">No creators yet</h3>
                        <p className="text-muted-foreground text-sm">Add your first creator to start tracking referrals</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isAddModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="fixed inset-0 z-[1000] bg-black/40 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="border border-transparent fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-card rounded-sheet z-[1001] p-6 shadow-overlay animate-in fade-in-0 zoom-in-96 duration-200 ease-snappy motion-reduce:animate-none"
                        >
                            <h2 className="text-xl font-semibold text-foreground mb-6">Add new creator</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">Full name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                        placeholder="e.g. Sarah Smith"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">Email address</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                        placeholder="sarah@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">Bio (Optional)</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm py-2.5 px-3.5 leading-relaxed h-24 resize-none"
                                        placeholder="Short description..."
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">Tracking code</label>
                                    <div className="flex gap-2">
                                        <input
                                            required
                                            type="text"
                                            value={formData.tracking_code}
                                            onChange={e => setFormData({ ...formData, tracking_code: e.target.value.toUpperCase() })}
                                            className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={generateCode}
                                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 border border-transparent bg-card text-foreground shadow-border hover:bg-muted h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                                        >
                                            Regenerate
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">This is the code students will enter during signup.</p>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 border border-transparent bg-card text-foreground shadow-border hover:bg-muted h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3 flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3 flex-1"
                                    >
                                        {isLoading ? 'Creating...' : 'Create creator'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
