'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Plus, X, Check, Star } from 'lucide-react'

interface CreditPackage {
    id: string
    name: string
    credits: number
    price_cents: number
    currency: string
    description: string | null
    is_popular: boolean | null
    is_active: boolean | null
    sort_order: number | null
}

interface Props {
    initialPackages: CreditPackage[]
}

export default function CreditPackagesManager({ initialPackages }: Props) {
    const [packages, setPackages] = useState<CreditPackage[]>(initialPackages)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const [formData, setFormData] = useState({
        name: '',
        credits: 5,
        price_cents: 4900,
        currency: 'gbp',
        description: '',
        is_popular: false,
        is_active: true,
        sort_order: 0
    })

    const formatPrice = (cents: number, currency: string = 'gbp') => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(cents / 100)
    }

    const resetForm = () => {
        setFormData({
            name: '',
            credits: 5,
            price_cents: 4900,
            currency: 'gbp',
            description: '',
            is_popular: false,
            is_active: true,
            sort_order: packages.length
        })
    }

    const startEdit = (pkg: CreditPackage) => {
        setEditingId(pkg.id)
        setFormData({
            name: pkg.name,
            credits: pkg.credits,
            price_cents: pkg.price_cents,
            currency: pkg.currency,
            description: pkg.description || '',
            is_popular: pkg.is_popular ?? false,
            is_active: pkg.is_active ?? true,
            sort_order: pkg.sort_order ?? 0
        })
        setIsCreating(false)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setIsCreating(false)
        resetForm()
    }

    const handleCreate = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/credit-packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setPackages([...packages, data.package])
            setIsCreating(false)
            resetForm()
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async () => {
        if (!editingId) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/credit-packages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingId, ...formData })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setPackages(packages.map(p => p.id === editingId ? data.package : p))
            setEditingId(null)
            resetForm()
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this package?')) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/credit-packages?id=${id}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setPackages(packages.filter(p => p.id !== id))
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleActive = async (pkg: CreditPackage) => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/credit-packages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: pkg.id, is_active: !pkg.is_active })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setPackages(packages.map(p => p.id === pkg.id ? data.package : p))
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center justify-between">
                    {error}
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Create New Package Button */}
            {!isCreating && !editingId && (
                <button
                    onClick={() => { setIsCreating(true); resetForm(); }}
                    className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add New Package
                </button>
            )}

            {/* Create/Edit Form */}
            {(isCreating || editingId) && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">
                        {isCreating ? 'Create New Package' : 'Edit Package'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Package Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                placeholder="e.g., Starter"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Credits (Hours)</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.credits}
                                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Price (in pence/cents)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.price_cents}
                                onChange={(e) => setFormData({ ...formData, price_cents: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                placeholder="4900 = £49.00"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Display: {formatPrice(formData.price_cents, formData.currency)}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Currency</label>
                            <div className="relative">
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none appearance-none transition-all pr-10"
                                >
                                    <option value="gbp">GBP (£)</option>
                                    <option value="usd">USD ($)</option>
                                    <option value="eur">EUR (€)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Sort Order</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.sort_order}
                                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-6 pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_popular}
                                    onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
                                />
                                <span className="text-sm font-medium text-gray-700">Popular</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
                                />
                                <span className="text-sm font-medium text-gray-700">Active</span>
                            </label>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none resize-none"
                                rows={2}
                                placeholder="Brief description shown to students"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={isCreating ? handleCreate : handleUpdate}
                            disabled={loading || !formData.name || formData.credits < 1}
                            className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                        >
                            <Check className="w-5 h-5" />
                            {loading ? 'Saving...' : (isCreating ? 'Create Package' : 'Save Changes')}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Packages Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Package</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Credits</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Price</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Order</th>
                            <th className="text-right px-6 py-4 text-sm font-bold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {packages.map((pkg) => (
                            <tr key={pkg.id} className={`hover:bg-gray-50 transition-colors ${!pkg.is_active ? 'opacity-50' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900">{pkg.name}</span>
                                        {pkg.is_popular && (
                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                        )}
                                    </div>
                                    {pkg.description && (
                                        <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">{pkg.description}</p>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-700">{pkg.credits} hrs</td>
                                <td className="px-6 py-4 font-bold text-accent">{formatPrice(pkg.price_cents, pkg.currency)}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => toggleActive(pkg)}
                                        disabled={loading}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${pkg.is_active
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        {pkg.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{pkg.sort_order}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => startEdit(pkg)}
                                            disabled={loading || isCreating || !!editingId}
                                            className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(pkg.id)}
                                            disabled={loading || isCreating || !!editingId}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {packages.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No credit packages yet. Create one to get started!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
