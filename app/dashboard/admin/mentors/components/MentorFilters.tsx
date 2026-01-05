'use client'

import { Search } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition, useEffect, useState } from 'react'

export function MentorFilters({ initialSearch, initialStatus }: { initialSearch: string, initialStatus: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [searchTerm, setSearchTerm] = useState(initialSearch)

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== initialSearch) {
                const params = new URLSearchParams(searchParams)
                if (searchTerm) {
                    params.set('search', searchTerm)
                } else {
                    params.delete('search')
                }
                params.set('page', '1')

                startTransition(() => {
                    router.push(`${pathname}?${params.toString()}`)
                })
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [searchTerm, initialSearch, pathname, router, searchParams])

    const handleStatusChange = (status: string) => {
        const params = new URLSearchParams(searchParams)
        params.set('status', status)
        params.set('page', '1')

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`)
        })
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
            <div className="relative w-full md:w-96">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isPending ? 'text-accent animate-pulse' : 'text-gray-400'}`} />
                <input
                    type="text"
                    placeholder="Search by bio or expertise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all shadow-inner"
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <select
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 focus:outline-none w-full md:w-auto cursor-pointer"
                    onChange={(e) => handleStatusChange(e.target.value)}
                    defaultValue={initialStatus}
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="details_required">Details Required</option>
                </select>
            </div>
        </div>
    )
}
