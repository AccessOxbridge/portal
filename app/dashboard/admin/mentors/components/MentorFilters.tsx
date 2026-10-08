'use client'

import { MagnifyingGlass as Search } from '@phosphor-icons/react/ssr'
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
        <div className="border border-transparent flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-card shadow-border">
            <div className="relative w-full md:w-96">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${isPending ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                <input
                    type="text"
                    placeholder="Search by bio or expertise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-10"
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-auto">
                    <select
                        className="bg-muted/60 border border-border rounded-control px-4 py-2 text-sm font-medium text-muted-foreground focus:outline-none appearance-none w-full md:w-auto cursor-pointer pr-10"
                        onChange={(e) => handleStatusChange(e.target.value)}
                        defaultValue={initialStatus}
                    >
                        <option value="all">All status</option>
                        <option value="active">Active</option>
                        <option value="pending_approval">Pending approval</option>
                        <option value="details_required">Details required</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}
