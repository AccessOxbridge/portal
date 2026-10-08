'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PencilSimple as Pencil, Trash as Trash2, Plus, X, Check, Star } from '@phosphor-icons/react/ssr'
import { SelectField } from '@/components/ui/select'

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
                <div className="p-4 bg-tint-rose border border-border rounded-card text-tint-rose-foreground text-sm flex items-center justify-between">
                    {error}
                    <button onClick={() => setError(null)} className="text-destructive hover:text-tint-rose-foreground">
                        <X className="size-4" />
                    </button>
                </div>
            )}

            {/* Create New Package Button */}
            {!isCreating && !editingId && (
                <button
                    onClick={() => { setIsCreating(true); resetForm(); }}
                    className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 text-base in-data-[density=compact]:h-9 in-data-[density=compact]:px-4 in-data-[density=compact]:text-sm"
                >
                    <Plus className="size-5" />
                    Add new package
                </button>
            )}

            {/* Create/Edit Form */}
            {(isCreating || editingId) && (
                <div className="border border-transparent bg-card rounded-card p-6 shadow-border">
                    <h3 className="text-xl font-semibold text-foreground mb-6">
                        {isCreating ? 'Create New Package' : 'Edit Package'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Package name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                placeholder="e.g., Starter"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Credits (Hours)</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.credits}
                                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Price (in pence/cents)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.price_cents}
                                onChange={(e) => setFormData({ ...formData, price_cents: parseInt(e.target.value) || 0 })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                placeholder="4900 = £49.00"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Display: {formatPrice(formData.price_cents, formData.currency)}
                            </p>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Currency</label>
                            <div className="relative">
                                <SelectField
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                >
                                    <option value="gbp">GBP (£)</option>
                                    <option value="usd">USD ($)</option>
                                    <option value="eur">EUR (€)</option>
                                </SelectField>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Sort order</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.sort_order}
                                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                            />
                        </div>
                        <div className="flex items-center gap-6 pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_popular}
                                    onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                                    className="size-5 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Popular</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="size-5 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Active</span>
                            </label>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm py-2.5 px-3.5 leading-relaxed resize-none"
                                rows={2}
                                placeholder="Brief description shown to students"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={isCreating ? handleCreate : handleUpdate}
                            disabled={loading || !formData.name || formData.credits < 1}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-control hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            <Check className="size-5" />
                            {loading ? 'Saving...' : (isCreating ? 'Create Package' : 'Save Changes')}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 border border-transparent bg-card text-foreground shadow-border hover:bg-muted h-11 px-5 text-base in-data-[density=compact]:h-9 in-data-[density=compact]:px-4 in-data-[density=compact]:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Packages Table */}
            <div className="bg-card rounded-card border border-border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/60 border-b border-border">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Package</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Credits</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Price</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Order</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {packages.map((pkg) => (
                            <tr key={pkg.id} className={`hover:bg-muted/60 transition-colors ${!pkg.is_active ? 'opacity-50' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-foreground">{pkg.name}</span>
                                        {pkg.is_popular && (
                                            <Star weight="fill" className="size-4 text-warning fill-amber-500" />
                                        )}
                                    </div>
                                    {pkg.description && (
                                        <p className="text-sm text-muted-foreground mt-1 truncate max-w-xs">{pkg.description}</p>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-medium text-foreground">{pkg.credits} hrs</td>
                                <td className="px-6 py-4 font-semibold text-primary">{formatPrice(pkg.price_cents, pkg.currency)}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => toggleActive(pkg)}
                                        disabled={loading}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${pkg.is_active
                                            ? 'bg-tint-green text-tint-green-foreground hover:bg-tint-green/70'
                                            : 'bg-muted text-muted-foreground hover:bg-muted'
                                            }`}
                                    >
                                        {pkg.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">{pkg.sort_order}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => startEdit(pkg)}
                                            disabled={loading || isCreating || !!editingId}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Pencil className="size-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(pkg.id)}
                                            disabled={loading || isCreating || !!editingId}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-tint-rose rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {packages.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                    No credit packages yet. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
