'use client'

import { Mail, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

interface StudentActionsProps {
    email: string
}

export function StudentActions({ email }: StudentActionsProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <div className="relative">
            <div className="flex items-center justify-end gap-2">
                <a
                    className="p-2 text-gray-400 hover:text-accent transition-colors"
                    title="Email Student"
                    href={`mailto:${email}`}
                >
                    <Mail className="w-4 h-4" />
                </a>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`p-2 transition-colors rounded-lg ${isMenuOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>

                {isMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden top-full">
                            <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                                View Profile
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
