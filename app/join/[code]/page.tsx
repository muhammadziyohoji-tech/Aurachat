'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Loader2, Sparkles } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' // Funksiyalarni emas, faqat supabase clientni olamiz

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.code as string
  
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError('')

    try {
      // 1. User ID ni aniqlaymiz (yoki yaratamiz)
      let userId = localStorage.getItem('userId')
      if (!userId) {
        userId = crypto.randomUUID()
        localStorage.setItem('userId', userId)
      }
      localStorage.setItem('username', username)

      // 2. Profilni bazada yangilaymiz/yaratamiz
      await supabase.from('profiles').upsert({
        id: userId,
        username: username
      })

      // 3. Invite kod orqali xonani topamiz
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('invite_code', inviteCode)
        .single()

      if (roomError || !room) {
        throw new Error('Room not found or link expired')
      }

      // 4. Foydalanuvchini xona a'zolariga qo'shamiz
      const { error: partError } = await supabase
        .from('room_participants')
        .upsert([{ 
          room_id: room.id, 
          user_id: userId 
        }], { onConflict: 'room_id,user_id' })

      if (partError) throw partError

      // 5. Chatga yo'naltiramiz
      router.push(`/chat/${room.id}`)

    } catch (err: any) {
      setError(err.message || 'Invalid or expired invite link')
      console.error('Join error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 to-purple-100 dark:from-gray-900 dark:to-purple-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/40 backdrop-blur-xl p-8 md:p-12 rounded-3xl max-w-md w-full text-center shadow-2xl border border-white/50"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-6 flex justify-center"
        >
          <div className="relative">
            <Heart className="w-20 h-20 text-pink-500 fill-pink-500" />
            <Sparkles className="absolute -top-2 -right-2 text-violet-500 w-8 h-8" />
          </div>
        </motion.div>

        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-600 mb-4">
          You've Been Invited
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Someone special wants to start a conversation with you. Enter your name to join.
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            placeholder="Your name..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-6 py-4 rounded-full bg-white/50 dark:bg-gray-800/50 border border-white/50 text-center text-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all text-gray-800 dark:text-white"
            autoFocus
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm font-medium"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!username.trim() || loading}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-600 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Conversation
                <Heart className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}