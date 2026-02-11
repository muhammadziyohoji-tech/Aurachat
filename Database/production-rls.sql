-- ================================================
-- PRODUCTION ROW LEVEL SECURITY POLICIES
-- ================================================
-- Run these policies for production deployment
-- Replace the development "Allow all" policies

-- ================================================
-- USERS TABLE POLICIES
-- ================================================

-- Drop development policies
DROP POLICY IF EXISTS "Allow all on users" ON users;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (id = (current_setting('request.jwt.claim.user_id', true))::uuid);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (id = (current_setting('request.jwt.claim.user_id', true))::uuid);

-- Users can insert their own data
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (id = (current_setting('request.jwt.claim.user_id', true))::uuid);

-- Users can see other searching users (for matching)
CREATE POLICY "Users can see searching users" ON users
  FOR SELECT USING (is_searching = true);

-- ================================================
-- ROOMS TABLE POLICIES
-- ================================================

-- Drop development policies
DROP POLICY IF EXISTS "Allow all on rooms" ON rooms;

-- Users can read rooms they're part of
CREATE POLICY "Users can read own rooms" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = rooms.id
      AND room_participants.user_id = (current_setting('request.jwt.claim.user_id', true))::uuid
    )
  );

-- Users can create rooms
CREATE POLICY "Users can create rooms" ON rooms
  FOR INSERT WITH CHECK (
    created_by = (current_setting('request.jwt.claim.user_id', true))::uuid
  );

-- Users can update their own rooms
CREATE POLICY "Users can update own rooms" ON rooms
  FOR UPDATE USING (
    created_by = (current_setting('request.jwt.claim.user_id', true))::uuid
  );

-- Anyone can read rooms by invite code (for joining)
CREATE POLICY "Anyone can read by invite code" ON rooms
  FOR SELECT USING (invite_code IS NOT NULL);

-- ================================================
-- ROOM PARTICIPANTS POLICIES
-- ================================================

-- Drop development policies
DROP POLICY IF EXISTS "Allow all on room_participants" ON room_participants;

-- Users can read participants in their rooms
CREATE POLICY "Users can read room participants" ON room_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = room_participants.room_id
      AND rp.user_id = (current_setting('request.jwt.claim.user_id', true))::uuid
    )
  );

-- Users can join rooms
CREATE POLICY "Users can join rooms" ON room_participants
  FOR INSERT WITH CHECK (
    user_id = (current_setting('request.jwt.claim.user_id', true))::uuid
  );

-- Users can update their own participant status
CREATE POLICY "Users can update own status" ON room_participants
  FOR UPDATE USING (
    user_id = (current_setting('request.jwt.claim.user_id', true))::uuid
  );

-- Users can leave rooms
CREATE POLICY "Users can leave rooms" ON room_participants
  FOR DELETE USING (
    user_id = (current_setting('request.jwt.claim.user_id', true))::uuid
  );

-- ================================================
-- MESSAGES TABLE POLICIES
-- ================================================

-- Drop development policies
DROP POLICY IF EXISTS "Allow all on messages" ON messages;

-- Users can read messages in their rooms
CREATE POLICY "Users can read room messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = messages.room_id
      AND room_participants.user_id = (current_setting('request.jwt.claim.user_id', true))::uuid
    )
  );

-- Users can send messages to rooms they're in
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = (current_setting('request.jwt.claim.user_id', true))::uuid
    AND EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = messages.room_id
      AND room_participants.user_id = (current_setting('request.jwt.claim.user_id', true))::uuid
    )
  );

-- Users can update their own messages (for reactions)
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (
    sender_id = (current_setting('request.jwt.claim.user_id', true))::uuid
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (
    sender_id = (current_setting('request.jwt.claim.user_id', true))::uuid
  );

-- ================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- ================================================

-- Function to prevent spam (max 10 messages per minute)
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  message_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO message_count
  FROM messages
  WHERE sender_id = NEW.sender_id
  AND created_at > NOW() - INTERVAL '1 minute';

  IF message_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending more messages.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rate limiting
DROP TRIGGER IF EXISTS message_rate_limit ON messages;
CREATE TRIGGER message_rate_limit
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_message_rate_limit();

-- Function to prevent joining too many rooms
CREATE OR REPLACE FUNCTION check_room_limit()
RETURNS TRIGGER AS $$
DECLARE
  room_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO room_count
  FROM room_participants
  WHERE user_id = NEW.user_id;

  IF room_count >= 10 THEN
    RAISE EXCEPTION 'Room limit exceeded. Maximum 10 active rooms per user.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for room limit
DROP TRIGGER IF EXISTS room_limit ON room_participants;
CREATE TRIGGER room_limit
  BEFORE INSERT ON room_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_room_limit();

-- ================================================
-- CONTENT MODERATION
-- ================================================

-- Function to check for inappropriate content
-- (This is a simple example - use a proper moderation service in production)
CREATE OR REPLACE FUNCTION check_message_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Check message length
  IF LENGTH(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Message too long. Maximum 5000 characters.';
  END IF;

  -- Check for empty messages
  IF LENGTH(TRIM(NEW.content)) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for content checking
DROP TRIGGER IF EXISTS message_content_check ON messages;
CREATE TRIGGER message_content_check
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_message_content();

-- ================================================
-- AUTOMATIC CLEANUP
-- ================================================

-- Schedule automatic cleanup of expired rooms
-- Note: This requires pg_cron extension
-- Enable in Supabase: Database → Extensions → pg_cron

-- Create cleanup job (runs every hour)
-- SELECT cron.schedule(
--   'cleanup-expired-rooms',
--   '0 * * * *', -- Every hour
--   $$ SELECT cleanup_expired_rooms() $$
-- );

-- ================================================
-- VERIFICATION
-- ================================================

-- Verify all policies are in place
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check all triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- ================================================
-- NOTES FOR PRODUCTION
-- ================================================
/*
Additional recommendations for production:

1. AUTHENTICATION:
   - Implement Supabase Auth instead of anonymous users
   - Add email verification
   - Implement OAuth providers (Google, Facebook, etc.)

2. RATE LIMITING:
   - Implement API rate limiting at the application level
   - Use Supabase Edge Functions for additional protection

3. MONITORING:
   - Set up logging for security events
   - Monitor for suspicious activity
   - Set up alerts for rate limit violations

4. CONTENT MODERATION:
   - Integrate a content moderation API (e.g., OpenAI Moderation)
   - Add profanity filters
   - Implement user reporting system

5. ENCRYPTION:
   - Consider end-to-end encryption for messages
   - Encrypt sensitive user data at rest

6. COMPLIANCE:
   - Implement GDPR compliance (data export, deletion)
   - Add terms of service and privacy policy
   - Implement age verification

7. PERFORMANCE:
   - Set up database connection pooling
   - Implement message pagination
   - Add caching for frequently accessed data

8. BACKUP:
   - Set up automated database backups
   - Test disaster recovery procedures
*/