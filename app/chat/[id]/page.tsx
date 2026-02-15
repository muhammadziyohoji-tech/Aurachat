'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, Heart, Copy, Check, Sparkles, User, ArrowLeft, Users, Share2 } from 'lucide-react'
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
  const [memberCount, setMemberCount] = useState(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      router.push('/')
      return
    }
    setUserId(storedUserId)

    const initChat = async () => {
      // 1. Room info & Member Count
      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
      setRoom(roomData)

      const { count } = await supabase
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
      setMemberCount(count || 0)

      // 2. Load Messages
      const { data: oldMsgs } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
      if (oldMsgs) setMessages(oldMsgs)

      // 3. Realtime Subscription (Duplicate Fix)
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
          // AGAR xabarni o'zimiz yozgan bo'lsak, uni bu yerdan olmaymiz (Optimistic UI ishlatganimiz uchun)
          if (incoming.sender_id === storedUserId) return

          setMessages((current) => [...current, incoming])
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
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    initChat()
  }, [roomId, router])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, otherUserTyping])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const content = newMessage.trim()
    setNewMessage('') 
    
    // Stop typing
    await supabase.from('room_participants').update({ is_typing: false }).eq('room_id', roomId).eq('user_id', userId)

    // Optimistic UI (Darrov ko'rsatish)
    const tempMsg: Message = {
        id: Math.random().toString(),
        room_id: roomId,
        sender_id: userId,
        content: content,
        created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])

    // Send to DB
    const { error } = await supabase.from('messages').insert([{
      room_id: roomId,
      sender_id: userId,
      content: content
    }])

    if (error) console.error("Message failed:", error)
  }

  const handleTyping = (val: string) => {
    setNewMessage(val)
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

  if (!room) return <div className="h-screen flex items-center justify-center dark:bg-gray-950 dark:text-white">Connecting to Aura...</div>

  return (
    <div className="flex flex-col h-screen bg-[#FDFCFE] dark:bg-gray-950">
      {/* Header */}
      <div className="p-4 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft size={20} className="dark:text-white"/>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-400 to-purple-600 flex items-center justify-center text-white shadow-lg">
            {room.type === 'private' ? <User size={20}/> : <Users size={20}/>}
          </div>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-white leading-tight">
              {room.name || (room.type === 'private' ? 'Private Aura' : 'Soul Group')}
            </h1>
            <p className="text-[10px] text-green-500 font-bold">
              {room.type === 'group' ? `${memberCount} / 20 Members` : 'Live & Encrypted'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {/* Love Letter Button */}
           <button 
             onClick={() => router.push('/love/create')}
             className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full hover:scale-110 transition-all"
             title="Send Love Letter"
           >
             <Heart size={20} fill="currentColor" />
           </button>

           {/* Share Link Button */}
           {room.invite_code && (
            <button onClick={copyInvite} className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-full text-xs font-bold hover:opacity-80 transition-all shadow-md">
                {copied ? <Check size={14}/> : <Share2 size={14}/>}
                {copied ? "Link Copied!" : "Share Link"}
            </button>
           )}
        </div>
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
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed break-words ${
                isMe ? 'bg-pink-500 text-white rounded-tr-none' 
                     : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'
              }`}>
                {msg.content}
                <div className={`text-[8px] mt-1 opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          )
        })}
        
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl flex gap-1 items-center">
              <span className="text-[10px] text-gray-500 font-bold mr-1 italic">Someone typing</span>
              <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="Message..."
              className="w-full bg-gray-100 dark:bg-gray-900 dark:text-white px-6 py-3.5 rounded-3xl focus:outline-none focus:ring-2 focus:ring-pink-400/50 transition-all border-none"
            />
            <Sparkles className="absolute right-4 top-3.5 text-pink-300 pointer-events-none" size={18} />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-12 h-12 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 transition-all disabled:opacity-50 shadow-lg active:scale-95"
          >
            <Send size={20} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  )
}