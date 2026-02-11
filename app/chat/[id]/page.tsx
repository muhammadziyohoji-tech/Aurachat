'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Heart, Copy, Check, Sparkles, MoreVertical } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, sendMessage, setTypingStatus, type Message, type Room, type RoomParticipant } from '@/lib/supabase'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<RoomParticipant[]>([])
  const [userId, setUserId] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      router.push('/')
      return
    }
    setUserId(storedUserId)
    loadRoomData(storedUserId)
    setupRealtimeSubscriptions(storedUserId)
  }, [roomId])

  const loadRoomData = async (currentUserId: string) => {
    // Load room details
    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomData) {
      setRoom(roomData)
    }

    // Load messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (messagesData) {
      setMessages(messagesData)
    }

    // Load participants
    const { data: participantsData } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)

    if (participantsData) {
      setParticipants(participantsData)
    }
  }

  const setupRealtimeSubscriptions = (currentUserId: string) => {
    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
          scrollToBottom()
        }
      )
      .subscribe()

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`room-typing-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const participant = payload.new as RoomParticipant
          if (participant.user_id !== currentUserId) {
            setOtherUserTyping(participant.is_typing)
          }
        }
      )
      .subscribe()

    return () => {
      messageChannel.unsubscribe()
      typingChannel.unsubscribe()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !userId) return

    try {
      await sendMessage(roomId, userId, newMessage)
      setNewMessage('')
      await setTypingStatus(roomId, userId, false)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (value.length > 0) {
      setTypingStatus(roomId, userId, true)
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(roomId, userId, false)
      }, 1000)
    } else {
      setTypingStatus(roomId, userId, false)
    }
  }

  const copyInviteLink = () => {
    if (room?.invite_code) {
      const link = `${window.location.origin}/join/${room.invite_code}`
      navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const addReaction = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ reaction: '💕' })
      .eq('id', messageId)

    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, reaction: '💕' } : msg
      )
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-romantic-500 animate-pulse" />
          <p className="text-xl text-gray-600 dark:text-gray-400">Loading your conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="glass-card-romantic border-b border-romantic-200/30 dark:border-romantic-700/30 p-4 sticky top-0 z-10"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-romantic-400 to-lavender-400 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              {participants.length > 1 && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                {room.type === 'private' ? 'Private Conversation' : 'Your Match'}
              </h2>
              {room.matched_interests && room.matched_interests.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {room.matched_interests.join(', ')}
                </p>
              )}
            </div>
          </div>

          {room.invite_code && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={copyInviteLink}
              className="btn-romantic-outline text-sm flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share Link'}
            </motion.button>
          )}
        </div>
      </motion.header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 max-w-4xl w-full mx-auto">
        <AnimatePresence>
          {messages.map((message, index) => {
            const isSent = message.sender_id === userId
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`mb-4 flex ${isSent ? 'justify-end' : 'justify-start'} group`}
              >
                <div className="relative max-w-[75%]">
                  <div className={`message-bubble ${isSent ? 'message-sent' : 'message-received'}`}>
                    {message.content}
                    {message.reaction && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-2 -right-2 text-2xl"
                      >
                        {message.reaction}
                      </motion.span>
                    )}
                  </div>
                  {!isSent && !message.reaction && (
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => addReaction(message.id)}
                      className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Heart className="w-5 h-5 text-romantic-400 hover:fill-romantic-400" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {otherUserTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex gap-2 mb-4"
            >
              <div className="glass-card px-4 py-3 rounded-3xl">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-romantic-400 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="glass-card-romantic border-t border-romantic-200/30 dark:border-romantic-700/30 p-4 sticky bottom-0"
      >
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-6 py-4 rounded-full glass-card focus:outline-none focus:ring-2 focus:ring-romantic-400 transition-all"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!newMessage.trim()}
            className="btn-romantic px-6 py-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}