'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Heart, Copy, Check, Sparkles, User } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Turlarni shu yerda aniqlaymiz, xatolik bo'lmasligi uchun
type Message = {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
  reaction?: string | null
}

type Room = {
  id: string
  type: string
  invite_code?: string | null
  matched_interests?: string[]
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [room, setRoom] = useState<Room | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [isTyping, setIsTyping] = useState(false) // Boshqalar yozyaptimi?
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Dastlabki yuklash
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      router.push('/')
      return
    }
    setUserId(storedUserId)
    loadRoomData()
    
    // useEffect ichidagi realtime qismini shunga almashtiring:

const channel = supabase
  .channel('public:messages') // Nomini o'zgartirdik
  .on(
    'postgres_changes',
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages'
      // filter: ... qismini olib tashladik, hammasini eshitib ko'ramiz
    },
    (payload) => {
      console.log('Yangi signal keldi:', payload) // Konsolga chiqarib tekshiramiz
      const newMsg = payload.new as Message
      if (newMsg.room_id === roomId) { // Filtrni shu yerda qilamiz
         setMessages((prev) => [...prev, newMsg])
      }
    }
  )
  .subscribe((status) => {
    console.log('Ulanish statusi:', status) // SUBSCRIBED chiqishi kerak
  })
          // Agar xabarni o'zimiz yuborgan bo'lsak, uni qayta qo'shmaymiz (dublikat bo'lmasligi uchun)
          if (newMsg.sender_id !== storedUserId) {
            setMessages((prev) => [...prev, newMsg])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const updatedUser = payload.new
          if (updatedUser.user_id !== storedUserId) {
            setIsTyping(updatedUser.is_typing)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // Xabarlar o'zgarganda pastga tushirish
  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const loadRoomData = async () => {
    // Xona ma'lumotlari
    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()
    if (roomData) setRoom(roomData)

    // Eski xabarlar
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
    if (msgs) setMessages(msgs)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !userId) return

    const content = newMessage.trim()
    setNewMessage('') // Inputni darrov tozalash
    
    // 1. Optimistic Update (Xabarni darrov ekranda ko'rsatish)
    const optimisticMsg: Message = {
      id: Date.now().toString(), // Vaqtincha ID
      room_id: roomId,
      sender_id: userId,
      content: content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    
    // Typingni o'chirish
    await supabase.from('room_participants').update({ is_typing: false }).eq('room_id', roomId).eq('user_id', userId)

    // 2. Bazaga yuborish
    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: userId,
      content: content
    })

    if (error) {
      console.error('Xatolik:', error)
      // Xato bo'lsa xabarni olib tashlash yoki qizil qilish mumkin
    }
  }

  const handleTyping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNewMessage(val)

    // Debounce typing status
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    // "Yozyapti..." statusini yoqish (bazaga har harfda sorov yubormaslik uchun optimize qilindi)
    if (val.length === 1) {
       await supabase.from('room_participants').update({ is_typing: true }).eq('room_id', roomId).eq('user_id', userId)
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await supabase.from('room_participants').update({ is_typing: false }).eq('room_id', roomId).eq('user_id', userId)
    }, 1500)
  }

  const copyInviteLink = () => {
    if (room?.invite_code) {
      const link = `${window.location.origin}/join/${room.invite_code}`
      navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <Sparkles className="w-10 h-10 text-pink-500 mb-2" />
          <p className="text-gray-500">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
            <User size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white leading-tight">
              {room.type === 'private' ? 'Private Chat' : 'Matched User'}
            </h2>
            {room.matched_interests && (
              <p className="text-xs text-pink-500 font-medium">
                 {room.matched_interests.join(' • ')}
              </p>
            )}
          </div>
        </div>

        {room.invite_code && (
          <button
            onClick={copyInviteLink}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
            title="Copy Link"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
        )}
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isMe = message.sender_id === userId
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`relative max-w-[85%] px-4 py-2.5 shadow-sm text-sm md:text-base break-words whitespace-pre-wrap leading-relaxed ${
                    isMe
                      ? 'bg-pink-500 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {message.content}
                  
                  {/* Reaction */}
                  {message.reaction && (
                    <span className="absolute -bottom-2 -right-1 bg-white dark:bg-gray-700 rounded-full p-0.5 text-xs shadow-sm border">
                      {message.reaction}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start w-full">
            <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-full rounded-tl-none flex gap-1 items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-gray-900 border-t flex gap-2 items-end">
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Type your message..."
          className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-5 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all max-h-32"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-full shadow-lg hover:shadow-pink-500/30 transition-all disabled:opacity-50 disabled:shadow-none flex-shrink-0"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}