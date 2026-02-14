'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, ShieldAlert, Heart, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function JoinPage() {
  const { code } = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'full' | 'error' | 'success'>('loading')
  const [roomInfo, setRoomInfo] = useState<{ name: string; type: string } | null>(null)

  useEffect(() => {
    const processJoin = async () => {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        router.push('/')
        return
      }

      // 1. Taklif kodi orqali xonani topish
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('invite_code', code)
        .single()

      if (roomError || !room) {
        setStatus('error')
        return
      }

      setRoomInfo({ name: room.name, type: room.type })

      // 2. Guruh bo'lsa, limitni tekshirish (20 kishi)
      if (room.type === 'group') {
        const { count, error: countError } = await supabase
          .from('room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)

        if (count !== null && count >= 20) {
          setStatus('full')
          return
        }
      }

      // 3. Foydalanuvchi allaqachon a'zomi? (Takroran qo'shilmaslik uchun)
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .single()

      if (!existingParticipant) {
        // Yangi a'zo sifatida qo'shish
        const { error: joinError } = await supabase
          .from('room_participants')
          .insert([{ 
            room_id: room.id, 
            user_id: userId 
          }])

        if (joinError) {
          setStatus('error')
          return
        }
      }

      // 4. Muvaffaqiyatli qo'shildi, chatga yo'naltiramiz
      setStatus('success')
      setTimeout(() => {
        router.push(`/chat/${room.id}`)
      }, 1500)
    }

    processJoin()
  }, [code, router])

  return (
    <div className="min-h-screen bg-[#FDFCFE] dark:bg-gray-950 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-2xl border border-pink-50 text-center"
      >
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Verifying Link...</h2>
            <p className="text-gray-500 text-sm">Wait a heartbeat, we're checking the room.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Heart className="text-green-500 fill-green-500 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Welcome!</h2>
            <p className="text-gray-500">Entering {roomInfo?.name || 'the chat'}...</p>
          </div>
        )}

        {status === 'full' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <Users className="text-amber-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Group is Full!</h2>
            <p className="text-gray-500 text-sm">This group has reached its 20-person limit. You can't join right now.</p>
            <button 
              onClick={() => router.push('/')}
              className="w-full py-3 bg-gray-900 dark:bg-white dark:text-black text-white rounded-2xl font-bold"
            >
              Go Back Home
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <ShieldAlert className="text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Invalid Link</h2>
            <p className="text-gray-500 text-sm">This invite link is expired or broken.</p>
            <button 
              onClick={() => router.push('/')}
              className="w-full py-3 bg-pink-500 text-white rounded-2xl font-bold"
            >
              Try Something Else
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}