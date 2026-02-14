'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function LetterView() {
  const { id } = useParams()
  const [letter, setLetter] = useState<any>(null)
  const [reactions, setReactions] = useState({ hearts: 0, kiss: 0, cry: 0 })

  useEffect(() => {
    const fetchLetter = async () => {
      const { data } = await supabase.from('love_letters').select('*').eq('id', id).single()
      if (data) {
        setLetter(data)
        setReactions(data.reactions || { hearts: 0, kiss: 0, cry: 0 })
      }
    }
    fetchLetter()

    const channel = supabase.channel(`letter_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'love_letters', filter: `id=eq.${id}` }, 
      (payload) => setReactions(payload.new.reactions))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const react = async (type: string) => {
    const updated = { ...reactions, [type]: (reactions as any)[type] + 1 }
    setReactions(updated)
    await supabase.from('love_letters').update({ reactions: updated }).eq('id', id)
  }

  if (!letter) return <div className="h-screen flex items-center justify-center">Opening letter...</div>

  const themes: any = {
    roses: "bg-rose-50 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]",
    bears: "bg-orange-50",
    galaxy: "bg-black text-white"
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${themes[letter.theme]}`}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-2xl w-full bg-white/10 backdrop-blur-xl p-12 rounded-[48px] shadow-2xl border border-white/20 text-center">
        <p className={`text-2xl md:text-4xl font-serif italic leading-relaxed mb-12 ${letter.theme === 'galaxy' ? 'text-white' : 'text-gray-800'}`}>
          "{letter.content}"
        </p>
        
        <div className="flex justify-center gap-6">
          {[
            { emoji: '❤️', type: 'hearts' },
            { emoji: '💋', type: 'kiss' },
            { emoji: '🥺', type: 'cry' }
          ].map((r) => (
            <button key={r.type} onClick={() => react(r.type)} className="flex flex-col items-center hover:scale-125 transition-transform">
              <span className="text-4xl">{r.emoji}</span>
              <span className="text-xs font-black mt-1">{(reactions as any)[r.type]}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}