'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Search, MessageCircle, Users, Send, X, AlertTriangle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Message {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    is_read: boolean
    created_at: string
}

interface Conversation {
    id: string
    student_id: string
    mentor_id: string
    last_message_at: string
    created_at: string
    student: {
        id: string
        full_name: string
        email: string
    }
    mentor: {
        id: string
        full_name: string
        email: string
    }
    message_count: number
    last_message?: {
        content: string
        sender_id: string
        created_at: string
    } | null
}

interface AdminMessagesContentProps {
    conversations: Conversation[]
    currentUserId: string
}

export default function AdminMessagesContent({
    conversations,
    currentUserId
}: AdminMessagesContentProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [adminMessage, setAdminMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Filter conversations by search term
    const filteredConversations = conversations.filter(conv => {
        const term = searchTerm.toLowerCase()
        return (
            (conv.student.full_name?.toLowerCase() || '').includes(term) ||
            (conv.mentor.full_name?.toLowerCase() || '').includes(term) ||
            (conv.student.email?.toLowerCase() || '').includes(term) ||
            (conv.mentor.email?.toLowerCase() || '').includes(term)
        )
    })

    // Load messages when conversation is selected
    useEffect(() => {
        if (!selectedConversation) return

        const loadMessages = async () => {
            setIsLoadingMessages(true)
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', selectedConversation.id)
                .order('created_at', { ascending: true })

            if (!error && data) {
                const formattedMessages: Message[] = data.map(m => ({
                    ...m,
                    is_read: m.is_read || false,
                    created_at: m.created_at || new Date().toISOString()
                }))
                setMessages(formattedMessages)
            }
            setIsLoadingMessages(false)
        }

        loadMessages()

        // Subscribe to new messages
        const channel = supabase
            .channel(`admin-messages:${selectedConversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${selectedConversation.id}`
                },
                (payload) => {
                    const newMessage = payload.new as any
                    const formattedMessage: Message = {
                        ...newMessage,
                        is_read: newMessage.is_read || false,
                        created_at: newMessage.created_at || new Date().toISOString()
                    }
                    setMessages(prev => {
                        if (prev.some(m => m.id === formattedMessage.id)) return prev
                        return [...prev, formattedMessage]
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedConversation])

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Admin can send a message (as system/admin intervention)
    const handleSendAdminMessage = async () => {
        if (!selectedConversation || !adminMessage.trim() || isSending) return

        setIsSending(true)
        const content = `[ADMIN] ${adminMessage.trim()}`

        try {
            await supabase.from('messages').insert({
                conversation_id: selectedConversation.id,
                sender_id: currentUserId,
                content
            })

            await supabase
                .from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', selectedConversation.id)

            setAdminMessage('')
        } catch (error) {
            console.error('Failed to send admin message:', error)
        } finally {
            setIsSending(false)
        }
    }

    const getSenderName = (senderId: string) => {
        if (!selectedConversation) return 'Unknown'
        if (senderId === currentUserId) return 'Admin'
        if (senderId === selectedConversation.student_id) return selectedConversation.student.full_name || 'Student'
        if (senderId === selectedConversation.mentor_id) return selectedConversation.mentor.full_name || 'Mentor'
        return 'Unknown'
    }

    const getSenderRole = (senderId: string) => {
        if (!selectedConversation) return ''
        if (senderId === currentUserId) return 'admin'
        if (senderId === selectedConversation.student_id) return 'student'
        if (senderId === selectedConversation.mentor_id) return 'mentor'
        return ''
    }

    return (
        <div className="flex gap-6 h-[calc(100vh-200px)]">
            {/* Conversations List */}
            <div className="w-96 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>{filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {conversations.reduce((sum, c) => sum + c.message_count, 0)} total messages
                        </span>
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                            <Users className="w-12 h-12 mb-3 text-gray-200" />
                            <p className="text-sm">No conversations found</p>
                        </div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedConversation(conv)}
                                className={`w-full p-4 text-left transition-all hover:bg-gray-50 ${selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-gray-900 truncate">
                                            {conv.student.full_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            ↔ {conv.mentor.full_name}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-[10px] text-gray-400">
                                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                    </span>
                                </div>
                                {conv.last_message && (
                                    <p className="text-xs text-gray-400 truncate">
                                        {conv.last_message.content}
                                    </p>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                        {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat View */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                {selectedConversation ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900">
                                    {selectedConversation.student.full_name} ↔ {selectedConversation.mentor.full_name}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Started {format(new Date(selectedConversation.created_at), 'MMM d, yyyy')}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedConversation(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50/50">
                            {isLoadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <MessageCircle className="w-12 h-12 mb-3 text-gray-200" />
                                    <p className="text-sm">No messages in this conversation</p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const role = getSenderRole(message.sender_id)
                                    const isAdmin = role === 'admin'

                                    return (
                                        <div key={message.id} className={`flex flex-col ${isAdmin ? 'items-center' : ''}`}>
                                            {isAdmin ? (
                                                <div className="max-w-lg px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                                                    <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-medium mb-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Admin Intervention
                                                    </div>
                                                    <p className="text-sm text-amber-900">{message.content.replace('[ADMIN] ', '')}</p>
                                                    <p className="text-[10px] text-amber-400 mt-1">
                                                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className={`max-w-[70%] ${role === 'student' ? 'self-start' : 'self-end'}`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-xs font-medium ${role === 'student' ? 'text-blue-600' : 'text-green-600'}`}>
                                                            {getSenderName(message.sender_id)}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            ({role})
                                                        </span>
                                                    </div>
                                                    <div className={`px-4 py-2.5 rounded-2xl ${role === 'student'
                                                        ? 'bg-blue-500 text-white rounded-bl-md'
                                                        : 'bg-green-500 text-white rounded-br-md'
                                                        }`}>
                                                        <p className="text-sm">{message.content}</p>
                                                    </div>
                                                    <p className={`text-[10px] text-gray-400 mt-1 ${role === 'student' ? 'text-left' : 'text-right'}`}>
                                                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Admin Intervention Input */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-amber-50">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-medium text-amber-700">Admin Intervention</span>
                            </div>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={adminMessage}
                                    onChange={(e) => setAdminMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendAdminMessage()}
                                    placeholder="Send a message as admin..."
                                    className="flex-1 px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-300"
                                />
                                <button
                                    onClick={handleSendAdminMessage}
                                    disabled={!adminMessage.trim() || isSending}
                                    className="px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSending ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <MessageCircle className="w-16 h-16 mb-4 text-gray-200" />
                        <p className="text-lg font-medium">Select a conversation</p>
                        <p className="text-sm text-gray-300 mt-1">Choose a chat to view and monitor</p>
                    </div>
                )}
            </div>
        </div>
    )
}
