'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import MessageBubble from './message-bubble'
import MessageInput from './message-input'

interface Message {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    is_read: boolean | null
    created_at: string | null
}

interface ChatWindowProps {
    conversationId: string
    currentUserId: string
    otherUser: {
        id: string
        full_name: string | null
        photo_url?: string | null
    }
}

export default function ChatWindow({
    conversationId,
    currentUserId,
    otherUser
}: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isOtherUserOnline, setIsOtherUserOnline] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Presence tracking
    useEffect(() => {
        const presenceChannel = supabase.channel(`presence:${conversationId}`)

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState()
                // Check if the other user is present
                const otherUserPresent = Object.values(state).some((presences: any) =>
                    presences.some((p: any) => p.user_id === otherUser.id)
                )
                setIsOtherUserOnline(otherUserPresent)
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                const otherUserJoined = newPresences.some((p: any) => p.user_id === otherUser.id)
                if (otherUserJoined) setIsOtherUserOnline(true)
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                const otherUserLeft = leftPresences.some((p: any) => p.user_id === otherUser.id)
                if (otherUserLeft) setIsOtherUserOnline(false)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track our own presence
                    await presenceChannel.track({
                        user_id: currentUserId,
                        online_at: new Date().toISOString()
                    })
                }
            })

        return () => {
            supabase.removeChannel(presenceChannel)
        }
    }, [conversationId, currentUserId, otherUser.id])

    // Fetch messages on mount and conversation change
    useEffect(() => {
        const fetchMessages = async () => {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })

            if (!error && data) {
                setMessages(data)
            }
            setIsLoading(false)
        }

        fetchMessages()

        // Mark messages as read
        supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', currentUserId)
            .eq('is_read', false)
            .then()

    }, [conversationId, currentUserId])

    // Subscribe to new messages in real-time
    useEffect(() => {
        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    const newMessage = payload.new as Message

                    // Ignore messages we sent ourselves (handled via optimistic updates)
                    if (newMessage.sender_id === currentUserId) {
                        return
                    }

                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.some(m => m.id === newMessage.id)) return prev
                        return [...prev, newMessage]
                    })

                    // Mark as read
                    supabase
                        .from('messages')
                        .update({ is_read: true })
                        .eq('id', newMessage.id)
                        .then()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId, currentUserId])

    // Scroll to bottom when messages load or change
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSendMessage = async (content: string) => {
        const tempId = `temp-${Date.now()}`

        // Optimistic update
        const optimisticMessage: Message = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: currentUserId,
            content,
            is_read: false,
            created_at: new Date().toISOString()
        }
        setMessages((prev) => [...prev, optimisticMessage])
        scrollToBottom()

        // Insert into database
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: currentUserId,
                content
            })
            .select()
            .single()

        if (error) {
            // Remove optimistic message on error
            setMessages((prev) => prev.filter(m => m.id !== tempId))
            throw error
        }

        // Update conversation's last_message_at
        await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId)

        // Replace optimistic message with real one
        if (data) {
            setMessages((prev) =>
                prev.map(m => m.id === tempId ? data : m)
            )
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">Loading messages...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b border-gray-100 bg-white px-6 py-4 flex items-center gap-4">
                <div className="relative">
                    {otherUser.photo_url ? (
                        <img
                            src={otherUser.photo_url}
                            alt={otherUser.full_name || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {otherUser.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                    {/* Online indicator dot */}
                    {isOtherUserOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">{otherUser.full_name || 'User'}</h3>
                    <p className={`text-xs ${isOtherUserOnline ? 'text-green-500' : 'text-gray-400'}`}>
                        {isOtherUserOnline ? 'Online' : 'Offline'}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50/50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg className="w-16 h-16 mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm font-medium">No messages yet</p>
                        <p className="text-xs text-gray-300 mt-1">Send a message to start the conversation!</p>
                    </div>
                ) : (
                    messages.map((message, index) => {
                        const isSent = message.sender_id === currentUserId
                        const isFirstFromSender = index === 0 || messages[index - 1].sender_id !== message.sender_id

                        return (
                            <MessageBubble
                                key={message.id}
                                content={message.content}
                                isSent={isSent}
                                timestamp={message.created_at || new Date().toISOString()}
                                isRead={message.is_read ?? false}
                                senderName={isSent ? undefined : otherUser.full_name || 'User'}
                                showAvatar={!isSent && isFirstFromSender}
                                avatarUrl={otherUser.photo_url}
                            />
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <MessageInput onSend={handleSendMessage} />
        </div>
    )
}
