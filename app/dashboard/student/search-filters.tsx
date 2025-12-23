'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface SearchFiltersProps {
    expertises: string[]
}

export default function SearchFilters({ expertises }: SearchFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')
    const expertiseFilter = searchParams.get('expertise') || ''

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const url = new URL(window.location.href)
        if (searchValue) url.searchParams.set('search', searchValue)
        else url.searchParams.delete('search')
        url.searchParams.set('page', '1')
        router.push(url.pathname + url.search)
    }

    const handleExpertiseChange = (value: string) => {
        const url = new URL(window.location.href)
        if (value) url.searchParams.set('expertise', value)
        else url.searchParams.delete('expertise')
        url.searchParams.set('page', '1')
        router.push(url.pathname + url.search)
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearchSubmit} className="relative group">
                <input
                    type="text"
                    name="search"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search mentors..."
                    className="pl-12 pr-4 py-3 w-full sm:w-64 rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 group-focus-within:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </form>

            <select
                name="expertise"
                value={expertiseFilter}
                onChange={(e) => handleExpertiseChange(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-600 font-medium cursor-pointer"
            >
                <option value="">All Expertise</option>
                {expertises.map(e => (
                    <option key={e} value={e}>{e}</option>
                ))}
            </select>
        </div>
    )
}

