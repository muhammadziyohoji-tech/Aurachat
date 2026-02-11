# AuraChat 💕 - Romantic Messenger Platform

A beautiful, romantic-themed messenger platform built with Next.js 14, Tailwind CSS, and Supabase. Connect hearts through private conversations or find your soulmate based on shared interests.

## ✨ Features

### 🔐 Private Rooms
- Generate unique, shareable links for private conversations
- Secure one-time invite codes
- 24-hour room expiration

### 💑 Soulmate Finder
- Interest-based matching algorithm
- Random pairing with compatible users
- Real-time matching notifications

### 💬 Beautiful Chat Interface
- Glassmorphism design aesthetic
- Real-time messaging with Supabase
- Typing indicators
- Heart reactions
- Smooth animations with Framer Motion
- Dark mode support

## 🎨 Design Features

- **Soft Minimalism** with Glassmorphism effects
- **Romantic Color Palette**: Soft pinks, deep purples, rose gold accents
- **Smooth Animations**: Framer Motion powered transitions
- **Responsive Design**: Mobile-first, premium app feel
- **Custom Scrollbars** and beautiful message bubbles

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Authentication**: Anonymous user creation
- **Real-time**: Supabase Realtime subscriptions

## 📋 Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd aurachat
npm install
```

### 2. Set Up Supabase

#### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to initialize

#### Run Database Migrations

In your Supabase SQL Editor, run these commands:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT,
  avatar_url TEXT,
  interests TEXT[],
  is_searching BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms Table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('private', 'matched')),
  created_by UUID REFERENCES users(id),
  invite_code TEXT UNIQUE,
  matched_interests TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Room Participants
CREATE TABLE room_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT false,
  UNIQUE(room_id, user_id)
);

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  reaction TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_messages_room ON messages(room_id, created_at DESC);
CREATE INDEX idx_room_participants ON room_participants(room_id);
CREATE INDEX idx_users_searching ON users(is_searching) WHERE is_searching = true;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for demo - customize for production)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all on rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "Allow all on room_participants" ON room_participants FOR ALL USING (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true);
```

#### Enable Realtime

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable replication for these tables:
   - `messages`
   - `room_participants`
   - `users`
   - `rooms`

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in your Supabase project settings under **API**.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Usage

### Creating a Private Room

1. Enter your name on the landing page
2. Click "Private Room"
3. Share the generated link with someone special
4. Start chatting when they join!

### Finding a Soulmate

1. Enter your name on the landing page
2. Click "Find Soulmate"
3. Select 3-5 interests that represent you
4. Click "Find My Soulmate"
5. Wait for a match (usually instant)
6. Start your romantic conversation!

## 🎯 Key Features Explained

### Real-time Messaging

Messages are delivered instantly using Supabase's real-time subscriptions:

```typescript
const messageChannel = supabase
  .channel(`room-messages-${roomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `room_id=eq.${roomId}`,
  }, (payload) => {
    setMessages(prev => [...prev, payload.new])
  })
  .subscribe()
```

### Typing Indicators

Real-time typing status updates:

```typescript
const typingChannel = supabase
  .channel(`room-typing-${roomId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'room_participants',
  }, (payload) => {
    setOtherUserTyping(payload.new.is_typing)
  })
  .subscribe()
```

### Interest-Based Matching

Algorithm finds users with the most common interests:

```typescript
export async function findMatch(userId: string, interests: string[]) {
  // Find searching users
  const { data: potentialMatches } = await supabase
    .from('users')
    .select('*')
    .eq('is_searching', true)
    .neq('id', userId)

  // Find best match based on common interests
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
  // ...
}
```

## 🎨 Customization

### Colors

Edit `tailwind.config.js` to customize the color palette:

```javascript
colors: {
  romantic: { /* pink shades */ },
  'rose-gold': { /* rose gold shades */ },
  lavender: { /* purple shades */ },
}
```

### Animations

Framer Motion animations can be customized in each component:

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* Content */}
</motion.div>
```

### Interests List

Modify the interests in `app/page.tsx`:

```typescript
const INTERESTS = [
  'Music', 'Travel', 'Poetry', 'Art', 'Books',
  // Add more interests here
]
```

## 🔒 Security Considerations

**For Production:**

1. **Implement proper RLS policies**:
   ```sql
   -- Example: Users can only see messages in their rooms
   CREATE POLICY "Users see own messages" ON messages
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM room_participants
         WHERE room_id = messages.room_id
         AND user_id = auth.uid()
       )
     );
   ```

2. **Add authentication**: Replace anonymous users with proper auth
3. **Rate limiting**: Implement message rate limits
4. **Content moderation**: Add profanity filters
5. **Encryption**: Consider end-to-end encryption for messages

## 📂 Project Structure

```
aurachat/
├── app/
│   ├── chat/[id]/        # Chat room page
│   ├── join/[code]/      # Join private room
│   ├── waiting/          # Matching waiting room
│   ├── page.tsx          # Landing page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── lib/
│   └── supabase.ts       # Supabase client & helpers
├── public/               # Static assets
├── .env.local            # Environment variables
├── tailwind.config.js    # Tailwind configuration
└── package.json          # Dependencies
```

## 🐛 Troubleshooting

### Messages not appearing in real-time
- Check that Realtime is enabled in Supabase
- Verify RLS policies allow reading
- Check browser console for subscription errors

### Cannot find matches
- Ensure at least 2 users are searching
- Check `is_searching` is set to `true`
- Verify database indexes exist

### Invite links not working
- Check `invite_code` is unique in database
- Verify room hasn't expired
- Check RLS policies on `rooms` table

## 🚀 Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📝 License

MIT License - feel free to use this for your own projects!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💖 Credits

Built with love using:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

---

Made with 💕 for connecting hearts