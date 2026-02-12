'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Heart, Copy, Check, Sparkles, User, ArrowLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Message = {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [room, setRoom] = useState<any>(null)
  const [userId, setUserId] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Foydalanuvchi va Xona ma'lumotlarini yuklash
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      router.push('/')
      return
    }
    setUserId(storedUserId)

    const initChat = async () => {
      // Xona ma'lumotlari
      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
      setRoom(roomData)

      // Eski xabarlar
      const { data: oldMsgs } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
      if (oldMsgs) setMessages(oldMsgs)

      // Realtime Ulanish (Eng muhim qismi)
      const channel = supabase.channel(`room_events_${roomId}`, {
        config: { broadcast: { self: true }, presence: { key: storedUserId } }
      })

      channel
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `room_id=eq.${roomId}` 
        }, (payload) => {
          const incoming = payload.new as Message
          // Xabar dublikat bo'lmasligi uchun tekshiramiz
          setMessages((current) => {
            if (current.find(m => m.id === incoming.id)) return current
            return [...current, incoming]
          })
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`
        }, (payload) => {
          if (payload.new.user_id !== storedUserId) {
            setOtherUserTyping(payload.new.is_typing)
          }
        })
        .subscribe((status) => {
          console.log("Realtime status:", status)
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }

    initChat()
  }, [roomId, router])

  // Xabarlar kelsa pastga tushirish
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, otherUserTyping])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const tempMsg = {
      id: Math.random().toString(), // Vaqtincha ID
      room_id: roomId,
      sender_id: userId,
      content: newMessage.trim(),
      created_at: new Date().toISOString()
    }

    setNewMessage('') // Inputni darhol tozalash
    
    // Typingni to'xtatish
    await supabase.from('room_participants').update({ is_typing: false }).eq('room_id', roomId).eq('user_id', userId)

    const { error } = await supabase.from('messages').insert([{
      room_id: roomId,
      sender_id: userId,
      content: tempMsg.content
    }])

    if (error) console.error("Xabar ketmadi:", error)
  }

  const handleTyping = (val: string) => {
    setNewMessage(val)
    
    // "Yozyapti..." signalini yuborish
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    
    supabase.from('room_participants').update({ is_typing: true }).eq('room_id', roomId).eq('user_id', userId)

    typingTimeoutRef.current = setTimeout(() => {
      supabase.from('room_participants').update({ is_typing: false }).eq('room_id', roomId).eq('user_id', userId)
    }, 2000)
  }

  const copyInvite = () => {
    const link = `${window.location.origin}/join/${room?.invite_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!room) return <div className="h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">Connecting to Aura...</div>

  return (
    <div className="flex flex-col h-screen bg-[#FDFCFE] dark:bg-gray-950">
      {/* Header */}
      <div className="p-4 border-b bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <ArrowLeft size={20} className="dark:text-white"/>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
            {room.type === 'private' ? 'P' : 'M'}
          </div>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-white">
              {room.type === 'private' ? 'Private Aura' : 'Matched Souls'}
            </h1>
            <p className="text-[10px] text-green-500 font-medium animate-pulse">Online & Secure</p>
          </div>
        </div>
        
        {room.invite_code && (
          <button onClick={copyInvite} className="flex items-center gap-2 bg-pink-50 text-pink-600 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-pink-100 transition-all border border-pink-100">
            {copied ? <Check size={14}/> : <Copy size={14}/>}
            {copied ? "Copied!" : "Invite Link"}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === userId
          return (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap ${
                isMe ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-tr-none' 
                     : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'
              }`}>
                {msg.content}
                <div className={`text-[9px] mt-1 opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          )
        })}
        
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full flex gap-1">
              <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-950 border-t">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-100 dark:bg-gray-900 dark:text-white px-5 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400/50 transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 transition-all disabled:opacity-50 shadow-lg shadow-pink-200 dark:shadow-none"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  )
}