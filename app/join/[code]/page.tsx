'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Loader2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { createAnonymousUser, joinRoomByCode } from '@/lib/supabase'

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
      const user = await createAnonymousUser(username)
      localStorage.setItem('userId', user.id)
      localStorage.setItem('username', username)

      const room = await joinRoomByCode(user.id, inviteCode)
      router.push(`/chat/${room.id}`)
    } catch (err) {
      setError('Invalid or expired invite link')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card-romantic p-8 md:p-12 rounded-3xl max-w-md w-full text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-6"
        >
          <Heart className="w-20 h-20 mx-auto text-romantic-500 fill-romantic-500" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gradient-romantic mb-4">
          You've Been Invited
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Someone special wants to start a conversation with you. Enter your name to join.
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            placeholder="Your name..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-6 py-4 rounded-full glass-card text-center text-lg focus:outline-none focus:ring-2 focus:ring-romantic-400 transition-all"
            autoFocus
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!username.trim() || loading}
            className="btn-romantic w-full flex items-center justify-center gap-2 disabled:opacity-50"
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