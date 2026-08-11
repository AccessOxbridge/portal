'use client'

import { useState } from 'react'
import { X, MessageCircle, Search, Users } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface ConnectedUser {
    id: string
    full_name: string | null
    photo_url?: string | null
    hasExistingConversation: boolean
    conversationId?: string
}

interface NewConversationDialogProps {
    isOpen: boolean
    onClose: () => void
    currentUserId: string
    connectedUsers: ConnectedUser[]
    userRole: 'student' | 'mentor'
}

export default function NewConversationDialog({
    isOpen,
    onClose,
    currentUserId,
    connectedUsers,
    userRole
}: NewConversationDialogProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreating, setIsCreating] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    if (!isOpen) return null

    const filteredUsers = connectedUsers.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleStartConversation = async (user: ConnectedUser) => {
        if (user.hasExistingConversation && user.conversationId) {
            // Just close the dialog - the conversation already exists
            onClose()
            router.refresh()
            return
        }

        setIsCreating(user.id)

        try {
            // Find the first admin to assign as Senior Strategist
            const { data: adminProfile } = await supabase
                .from('profiles')
                .select('id')
                .in('role', ['admin', 'admin-dev'])
                .limit(1)
                .single()

            // Create new conversation
            const conversationData = userRole === 'student'
                ? {
                    student_id: currentUserId,
                    mentor_id: user.id,
                    admin_id: adminProfile?.id || null
                }
                : {
                    student_id: user.id,
                    mentor_id: currentUserId,
                    admin_id: adminProfile?.id || null
                }

            const { error } = await supabase
                .from('conversations')
                .insert(conversationData)

            if (error) {
                console.error('Failed to create conversation:', error)
            }

            onClose()
            router.refresh()
        } catch (error) {
            console.error('Error creating conversation:', error)
        } finally {
            setIsCreating(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md sm:mx-4 max-h-[92dvh] sm:max-h-none overflow-y-auto sm:overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Start a Conversation</h2>
                        <p className="text-sm text-gray-500">
                            Select a {userRole === 'student' ? 'mentor' : 'student'} to chat with
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={`Search ${userRole === 'student' ? 'mentors' : 'students'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        />
                    </div>
                </div>

                {/* User List */}
                <div className="max-h-80 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Users className="w-12 h-12 mb-3 text-gray-200" />
                            <p className="text-sm font-medium">
                                {connectedUsers.length === 0
                                    ? `No connected ${userRole === 'student' ? 'mentors' : 'students'} yet`
                                    : 'No matches found'
                                }
                            </p>
                            {connectedUsers.length === 0 && (
                                <p className="text-xs text-gray-300 mt-1">
                                    {userRole === 'student'
                                        ? 'Request a mentor to get started'
                                        : 'Accept a request to connect with students'
                                    }
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredUsers.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleStartConversation(user)}
                                    disabled={isCreating === user.id}
                                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                                >
                                    {/* Avatar */}
                                    {user.photo_url ? (
                                        <img
                                            src={user.photo_url}
                                            alt={user.full_name || 'User'}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                                            {user.full_name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">
                                            {user.full_name || (userRole === 'student' ? 'Mentor' : 'Student')}
                                        </p>
                                        {user.hasExistingConversation ? (
                                            <p className="text-xs text-green-600 font-medium">
                                                Existing conversation
                                            </p>
                                        ) : (
                                            <p className="text-xs text-gray-400">
                                                Click to start chatting
                                            </p>
                                        )}
                                    </div>

                                    {/* Action */}
                                    {isCreating === user.id ? (
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <MessageCircle className={`w-5 h-5 ${user.hasExistingConversation ? 'text-green-500' : 'text-gray-300'}`} />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-400 text-center">
                        {connectedUsers.length} connected {userRole === 'student' ? 'mentor' : 'student'}{connectedUsers.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </div>
    )
}
