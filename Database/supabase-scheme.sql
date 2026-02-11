-- AuraChat Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- TABLES
-- ================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT,
  avatar_url TEXT,
  interests TEXT[] DEFAULT '{}',
  is_searching BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms Table (For both private and matched chats)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('private', 'matched')),
  created_by UUID REFERENCES users(id),
  invite_code TEXT UNIQUE,
  matched_interests TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Room Participants
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT false,
  UNIQUE(room_id, user_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  reaction TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- ================================================
-- INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_users_searching ON users(is_searching) WHERE is_searching = true;
CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON rooms(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active) WHERE is_active = true;

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES (Development - Allow All)
-- ================================================
-- Note: For production, implement stricter policies

-- Users policies
DROP POLICY IF EXISTS "Allow all on users" ON users;
CREATE POLICY "Allow all on users" ON users
  FOR ALL USING (true);

-- Rooms policies
DROP POLICY IF EXISTS "Allow all on rooms" ON rooms;
CREATE POLICY "Allow all on rooms" ON rooms
  FOR ALL USING (true);

-- Room participants policies
DROP POLICY IF EXISTS "Allow all on room_participants" ON room_participants;
CREATE POLICY "Allow all on room_participants" ON room_participants
  FOR ALL USING (true);

-- Messages policies
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
CREATE POLICY "Allow all on messages" ON messages
  FOR ALL USING (true);

-- ================================================
-- FUNCTIONS
-- ================================================

-- Function to clean up expired rooms
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
  UPDATE rooms
  SET is_active = false
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET last_active = NOW()
  WHERE id = NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_active when message is sent
DROP TRIGGER IF EXISTS update_last_active_on_message ON messages;
CREATE TRIGGER update_last_active_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();

-- ================================================
-- REALTIME SETUP
-- ================================================
-- You still need to enable realtime in Supabase Dashboard:
-- Database → Replication → Enable for:
-- - users
-- - rooms
-- - room_participants
-- - messages

-- ================================================
-- SAMPLE DATA (Optional - for testing)
-- ================================================

-- Uncomment to insert sample data for testing
/*
INSERT INTO users (username, interests) VALUES
  ('Alice', ARRAY['Music', 'Travel', 'Art']),
  ('Bob', ARRAY['Music', 'Books', 'Photography']);

INSERT INTO rooms (type, created_by, matched_interests) VALUES
  ('matched', (SELECT id FROM users WHERE username = 'Alice'), ARRAY['Music']);

INSERT INTO room_participants (room_id, user_id)
SELECT 
  r.id,
  u.id
FROM rooms r
CROSS JOIN users u
WHERE r.type = 'matched';

INSERT INTO messages (room_id, sender_id, content)
SELECT 
  r.id,
  (SELECT id FROM users WHERE username = 'Alice'),
  'Hello! 💕'
FROM rooms r
WHERE r.type = 'matched'
LIMIT 1;
*/

-- ================================================
-- VERIFICATION QUERIES
-- ================================================
-- Run these to verify the setup

-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'rooms', 'room_participants', 'messages');

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'rooms', 'room_participants', 'messages');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'rooms', 'room_participants', 'messages');

-- ================================================
-- COMPLETE
-- ================================================
-- Database setup complete!
-- Next steps:
-- 1. Enable Realtime in Supabase Dashboard for all tables
-- 2. Update your .env.local file with Supabase credentials
-- 3. Run 'npm run dev' to start the application