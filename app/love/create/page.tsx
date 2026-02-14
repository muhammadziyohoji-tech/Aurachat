'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Heart, Stars, Sparkles } from 'lucide-react'

export default function CreateLetter() {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [theme, setTheme] = useState('roses')
  const [loading, setLoading] = useState(false)

  const handleFinish = async () => {
    if (!content.trim()) return
    setLoading(true)
    const userId = localStorage.getItem('userId')

    const { data, error } = await supabase
      .from('love_letters')
      .insert([{ sender_id: userId, content, theme }])
      .select().single()

    if (data) router.push(`/love/${data.id}`)
    else { alert(error?.message); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-[40px] p-10 shadow-2xl">
        <h1 className="text-3xl font-black text-center mb-2 text-rose-600">Write a Love Letter 💌</h1>
        <p className="text-center text-gray-400 mb-8 font-medium">Your design, your words, your soul.</p>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing your heart out..."
          className="w-full h-48 p-6 bg-rose-50/30 rounded-3xl border-2 border-rose-100 focus:border-rose-400 outline-none text-rose-900 font-serif text-xl italic resize-none"
        />

        <div className="mt-8 grid grid-cols-3 gap-3">
          {['roses', 'bears', 'galaxy'].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-4 rounded-2xl border-2 capitalize font-bold transition-all ${theme === t ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-gray-100 text-gray-400'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={handleFinish}
          disabled={loading}
          className="w-full mt-8 bg-rose-500 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-rose-200 hover:scale-[1.02] transition-all"
        >
          {loading ? 'Creating Magic...' : 'Finish & Get Link ✨'}
        </button>
      </div>
    </div>
  )
}