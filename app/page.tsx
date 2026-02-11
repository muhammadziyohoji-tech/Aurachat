'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Sparkles, Users, Link as LinkIcon, ArrowRight, Stars } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createAnonymousUser, createPrivateRoom, findMatch } from '@/lib/supabase'

const INTERESTS = [
  'Music', 'Travel', 'Poetry', 'Art', 'Books', 
  'Movies', 'Photography', 'Cooking', 'Dancing', 'Gaming',
  'Fitness', 'Fashion', 'Nature', 'Astronomy', 'Coffee'
]

// Animated Background Component (Window xatosini oldini olish uchun alohida)
const FloatingHearts = () => {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl opacity-20"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            y: [null, -100],
            rotate: [0, 360],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5,
          }}
        >
          {['💕', '💖', '✨', '🌸', '💝'][Math.floor(Math.random() * 5)]}
        </motion.div>
      ))}
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'choose' | 'interests' | 'private'>('choose')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 5
        ? [...prev, interest]
        : prev
    )
  }

  const handleCreatePrivateRoom = async () => {
    if (!username.trim()) return
    setLoading(true)

    try {
      console.log('Creating user...')
      const user = await createAnonymousUser(username)
      
      // Ma'lumotlarni saqlaymiz
      localStorage.setItem('userId', user.id)
      localStorage.setItem('username', username)

      console.log('Creating room...')
      const room = await createPrivateRoom(user.id)
      
      console.log('Redirecting to:', room.id)
      router.push(`/chat/${room.id}`)
      
    } catch (error: any) {
      console.error('Xatolik yuz berdi:', error)
      alert(`Xatolik: ${error.message || 'Something went wrong'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFindMatch = async () => {
    if (selectedInterests.length < 3 || !username.trim()) return
    setLoading(true)

    try {
      const user = await createAnonymousUser(username, selectedInterests)
      localStorage.setItem('userId', user.id)
      localStorage.setItem('username', username)

      const room = await findMatch(user.id, selectedInterests)
      
      if (room) {
        router.push(`/chat/${room.id}`)
      } else {
        // Hozircha shunchaki waiting pagega yo'naltiramiz
        // (Waiting page hali yo'q bo'lsa, chatga yo'naltirib turing)
        alert("Hozircha bo'sh sherik topilmadi. Kutish rejimiga o'tilmoqda (Demo).")
        // router.push('/waiting') 
      }
    } catch (error: any) {
      console.error('Match xatosi:', error)
      alert('Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative bg-gradient-to-br from-pink-50 to-purple-100 dark:from-gray-900 dark:to-purple-900">
      
      <FloatingHearts />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl relative z-10"
      >
        <AnimatePresence mode="wait">
          {mode === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              {/* Logo */}
              <motion.div
                className="mb-8 flex items-center justify-center gap-3"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Heart className="w-12 h-12 text-pink-500 fill-pink-500" />
                <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-600">
                  AuraChat
                </h1>
                <Sparkles className="w-12 h-12 text-violet-500" />
              </motion.div>

              <p className="text-xl text-gray-700 dark:text-gray-300 mb-12 max-w-2xl mx-auto font-light">
                Build beutiful communications.
              </p>

              {/* Username Input */}
              <motion.div className="mb-8">
                <input
                  type="text"
                  placeholder="Write your name..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full max-w-md mx-auto px-6 py-4 rounded-full bg-white/30 backdrop-blur-md border border-white/50 shadow-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-800 placeholder-gray-500"
                />
              </motion.div>

              {/* Buttons */}
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMode('private')}
                  disabled={!username.trim()}
                  className="bg-white/40 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/60 hover:border-pink-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <LinkIcon className="w-12 h-12 mx-auto mb-4 text-pink-500 group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl font-bold mb-2 text-gray-800">Private Room</h3>
                  <p className="text-gray-600 text-sm">Talk with your friends by a private link</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMode('interests')}
                  disabled={!username.trim()}
                  className="bg-white/40 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/60 hover:border-violet-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Users className="w-12 h-12 mx-auto mb-4 text-violet-500 group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl font-bold mb-2 text-gray-800">Find Soulmate</h3>
                  <p className="text-gray-600 text-sm">Find people who have similar interests with you</p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {mode === 'interests' && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50"
            >
              <button onClick={() => setMode('choose')} className="mb-4 text-pink-600 font-medium">← Back</button>
              <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">About you...</h2>
              <p className="text-center text-gray-600 mb-6">Select from 3 to 5</p>
              
              <div className="flex flex-wrap gap-3 justify-center mb-8">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedInterests.includes(interest)
                        ? 'bg-pink-500 text-white shadow-lg transform scale-105'
                        : 'bg-white/50 text-gray-700 hover:bg-white'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={handleFindMatch}
                  disabled={selectedInterests.length < 3 || loading}
                  className="bg-gradient-to-r from-pink-500 to-violet-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {loading ? 'Finding...' : 'Soulmate finding'} <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'private' && (
            <motion.div
              key="private"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 max-w-xl mx-auto text-center"
            >
              <button onClick={() => setMode('choose')} className="mb-4 text-pink-600 font-medium">← Back</button>
              <LinkIcon className="w-16 h-16 mx-auto mb-4 text-pink-500" />
              <h2 className="text-3xl font-bold mb-4 text-gray-800">Private room</h2>
              <p className="text-gray-600 mb-8">We give you a private link. You can send it to your friends and talk with them.</p>
              
              <button
                onClick={handleCreatePrivateRoom}
                disabled={loading}
                className="bg-gradient-to-r from-pink-500 to-violet-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {loading ? 'creating...' : 'create a room'} <Heart size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}