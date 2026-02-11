'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Sparkles, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WaitingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      router.push('/')
      return
    }
    setUserId(storedUserId)

    // Listen for when user gets matched
    const channel = supabase
      .channel('user-rooms')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_participants',
          filter: `user_id=eq.${storedUserId}`,
        },
        async (payload: { new: { room_id: any } }) => {
          // User has been added to a room
          const roomId = payload.new.room_id
          router.push(`/chat/${roomId}`)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card-romantic p-8 md:p-12 rounded-3xl max-w-md w-full text-center"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            repeatType: 'reverse'
          }}
          className="mb-6"
        >
          <Users className="w-20 h-20 mx-auto text-lavender-500" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gradient-romantic mb-4">
          Finding Your Match...
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          We're searching for someone special who shares your interests. This usually takes just a moment.
        </p>

        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-gradient-to-r from-romantic-400 to-lavender-400 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="mt-8 p-4 glass-card rounded-2xl"
        >
          <div className="flex items-center gap-2 justify-center text-sm text-gray-600 dark:text-gray-400">
            <Sparkles className="w-4 h-4 text-romantic-400" />
            <span>Creating the perfect connection for you</span>
          </div>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/')}
          className="mt-8 btn-romantic-outline"
        >
          Cancel Search
        </motion.button>
      </motion.div>
    </div>
  )
}