'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

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
            alert('Failed to add creator. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">All Creators</h2>
                    <p className="text-sm text-gray-500">Manage creators and view their performance</p>
                </div>
                <button
                    onClick={() => {
                        generateCode()
                        setIsAddModalOpen(true)
                    }}
                    className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-accent/10 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Creator
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {creators.map((creator) => (
                    <div key={creator.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-blue-50 flex items-center justify-center text-lg font-bold text-accent">
                                {creator.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">{creator.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span>{creator.email}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                    <span className="font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-xs">
                                        {creator.tracking_code}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <span className="block text-2xl font-bold text-gray-900">{creator.referrals_count || 0}</span>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Referrals</span>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}

                {creators.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <h3 className="text-gray-900 font-medium mb-1">No creators yet</h3>
                        <p className="text-gray-500 text-sm">Add your first creator to start tracking referrals</p>
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
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 p-6"
                        >
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Creator</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                        placeholder="e.g. Sarah Smith"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                        placeholder="sarah@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio (Optional)</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent h-24 resize-none"
                                        placeholder="Short description..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Code</label>
                                    <div className="flex gap-2">
                                        <input
                                            required
                                            type="text"
                                            value={formData.tracking_code}
                                            onChange={e => setFormData({ ...formData, tracking_code: e.target.value.toUpperCase() })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono uppercase"
                                        />
                                        <button
                                            type="button"
                                            onClick={generateCode}
                                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                                        >
                                            Regenerate
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">This is the code students will enter during signup.</p>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-accent/10 disabled:opacity-50"
                                    >
                                        {isLoading ? 'Creating...' : 'Create Creator'}
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
