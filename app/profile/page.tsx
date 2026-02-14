'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User, Save, Crown, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [error, setError] = useState('')

  const availableInterests = ['Music 🎵', 'Travel ✈️', 'Gaming 🎮', 'Art 🎨', 'Movies 🎬', 'Books 📚', 'Tech 💻', 'Fitness 🏋️']

  useEffect(() => {
    const fetchProfile = async () => {
      const storedId = localStorage.getItem('userId')
      if (!storedId) return router.push('/')
      setUserId(storedId)

      const { data } = await supabase.from('profiles').select('*').eq('id', storedId).single()
      if (data) {
        setUsername(data.username || '')
        setFullName(data.full_name || '')
        setInterests(data.interests || [])
        setIsPremium(data.is_premium || false)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [router])

  const handleSave = async () => {
    setError('')
    const isAlphaOnly = /^[a-zA-Z]+$/.test(username)

    if (isAlphaOnly && !isPremium) {
      setError("Letter-only usernames are Premium! Please add a number or upgrade.")
      return
    }

    const { error: updateError } = await supabase.from('profiles').upsert({
      id: userId,
      username,
      full_name: fullName,
      interests,
      updated_at: new Date()
    })

    if (updateError) setError(updateError.message)
    else alert('Profile Updated! ✨')
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950 p-6 flex flex-col items-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-xl border border-pink-100">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">Profile</h1>
          {isPremium && <Crown className="text-amber-400 fill-amber-400" />}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">Username</label>
            <input 
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none transition-all dark:text-white"
              placeholder="e.g. lover123"
            />
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">Interests</label>
            <div className="flex flex-wrap gap-2">
              {availableInterests.map(item => (
                <button
                  key={item}
                  onClick={() => setInterests(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${interests.includes(item) ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} className="w-full bg-black dark:bg-white dark:text-black text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
            <CheckCircle size={20} /> Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  )
}