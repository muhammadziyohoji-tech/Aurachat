import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database types
export interface User {
  id: string
  username: string | null
  avatar_url: string | null
  interests: string[]
  is_searching: boolean
  created_at: string
  last_active: string
}

export interface Room {
  id: string
  type: 'private' | 'matched'
  created_by: string
  invite_code: string | null
  matched_interests: string[]
  is_active: boolean
  created_at: string
  expires_at: string | null
}

export interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  reaction: string | null
  created_at: string
  read_at: string | null
}

export interface RoomParticipant {
  id: string
  room_id: string
  user_id: string
  joined_at: string
  is_typing: boolean
}

// Helper functions
export async function createAnonymousUser(username: string, interests: string[] = []) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      interests,
      is_searching: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createPrivateRoom(userId: string) {
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()
  
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      type: 'private',
      created_by: userId,
      invite_code: inviteCode,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })
    .select()
    .single()

  if (roomError) throw roomError

  // Add creator as participant
  const { error: participantError } = await supabase
    .from('room_participants')
    .insert({
      room_id: room.id,
      user_id: userId,
    })

  if (participantError) throw participantError

  return room
}

export async function joinRoomByCode(userId: string, inviteCode: string) {
  // Find room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('is_active', true)
    .single()

  if (roomError || !room) throw new Error('Invalid or expired room code')

  // Check if already joined
  const { data: existing } = await supabase
    .from('room_participants')
    .select('*')
    .eq('room_id', room.id)
    .eq('user_id', userId)
    .single()

  if (!existing) {
    const { error: participantError } = await supabase
      .from('room_participants')
      .insert({
        room_id: room.id,
        user_id: userId,
      })

    if (participantError) throw participantError
  }

  return room
}

export async function findMatch(userId: string, interests: string[]) {
  // Update user to searching
  await supabase
    .from('users')
    .update({ is_searching: true, interests })
    .eq('id', userId)

  // Find someone searching with similar interests
  const { data: potentialMatches } = await supabase
    .from('users')
    .select('*')
    .eq('is_searching', true)
    .neq('id', userId)
    .limit(10)

  if (!potentialMatches || potentialMatches.length === 0) {
    return null // No matches available
  }

  // Simple matching: find user with most common interests
  let bestMatch = potentialMatches[0]
  let maxCommon = 0

  for (const match of potentialMatches) {
    const common = interests.filter(i => match.interests.includes(i)).length
    if (common > maxCommon) {
      maxCommon = common
      bestMatch = match
    }
  }

  // Create matched room
  const commonInterests = interests.filter(i => bestMatch.interests.includes(i))
  
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      type: 'matched',
      created_by: userId,
      matched_interests: commonInterests,
    })
    .select()
    .single()

  if (roomError) throw roomError

  // Add both users as participants
  await supabase.from('room_participants').insert([
    { room_id: room.id, user_id: userId },
    { room_id: room.id, user_id: bestMatch.id },
  ])

  // Mark both as not searching
  await supabase
    .from('users')
    .update({ is_searching: false })
    .in('id', [userId, bestMatch.id])

  return room
}

export async function sendMessage(roomId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_id: senderId,
      content,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function setTypingStatus(roomId: string, userId: string, isTyping: boolean) {
  await supabase
    .from('room_participants')
    .update({ is_typing: isTyping })
    .eq('room_id', roomId)
    .eq('user_id', userId)
}