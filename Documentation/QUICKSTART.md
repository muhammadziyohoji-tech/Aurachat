# AuraChat - Quick Start Guide 🚀

Get your romantic messenger up and running in 10 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed ([Download](https://nodejs.org/))
- [ ] npm or yarn package manager
- [ ] Supabase account ([Sign up free](https://supabase.com))
- [ ] Code editor (VS Code recommended)

## Step-by-Step Setup

### 1️⃣ Install Dependencies (2 minutes)

```bash
cd aurachat
npm install
```

Expected output: All dependencies installed without errors.

### 2️⃣ Set Up Supabase (5 minutes)

#### Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and enter:
   - **Name**: AuraChat
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
4. Click "Create new project" and wait ~2 minutes

#### Run Database Setup
1. In Supabase Dashboard, click "SQL Editor"
2. Click "New Query"
3. Copy entire contents of `supabase-schema.sql`
4. Paste and click "Run"
5. Wait for "Success" message

#### Enable Realtime
1. Go to "Database" → "Replication"
2. Enable these tables:
   - ✅ users
   - ✅ rooms
   - ✅ room_participants
   - ✅ messages
3. Click "Save"

#### Get API Credentials
1. Go to "Settings" → "API"
2. Copy:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public** key (long string starting with "eyJ...")

### 3️⃣ Configure Environment (1 minute)

Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key-here
```

### 4️⃣ Run the Application (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the beautiful AuraChat landing page! 🎉

## Testing Your Setup

### Test Private Rooms

1. Enter your name (e.g., "Alice")
2. Click "Private Room"
3. Copy the generated link
4. Open in incognito/private window
5. Enter different name (e.g., "Bob")
6. Start chatting!

### Test Matching

**Window 1:**
1. Enter name "Alice"
2. Click "Find Soulmate"
3. Select interests: Music, Travel, Art
4. Click "Find My Soulmate"
5. See "Finding Your Match..." screen

**Window 2:**
1. Open new window
2. Enter name "Bob"
3. Click "Find Soulmate"
4. Select interests: Music, Books, Travel
5. Click "Find My Soulmate"

Both should instantly match and start chatting!

## Common Issues & Solutions

### ❌ "Cannot find module '@supabase/supabase-js'"
**Solution**: Run `npm install` again

### ❌ "Invalid API key"
**Solution**: 
1. Check `.env.local` file exists
2. Verify credentials are correct (no spaces)
3. Restart dev server: `Ctrl+C` then `npm run dev`

### ❌ Messages not appearing in real-time
**Solution**:
1. Check Realtime is enabled in Supabase Dashboard
2. Verify all 4 tables have replication enabled
3. Check browser console for errors

### ❌ No matches found
**Solution**:
1. Open two different browser windows/tabs
2. Make sure both users have selected interests
3. Click "Find My Soulmate" on BOTH windows

### ❌ Database error on message send
**Solution**:
1. Verify `supabase-schema.sql` ran successfully
2. Check all tables exist in Supabase Dashboard → Table Editor
3. Re-run the SQL schema

## Next Steps

### 🎨 Customize Your App

**Change Colors:**
Edit `tailwind.config.js` - romantic, rose-gold, lavender colors

**Add More Interests:**
Edit `app/page.tsx` - INTERESTS array

**Change Animations:**
Edit component files - Framer Motion props

### 🚀 Deploy to Production

**Vercel Deployment:**
```bash
npm install -g vercel
vercel
```

Follow prompts and add environment variables in Vercel dashboard.

**Before Production:**
1. Run `production-rls.sql` for security
2. Add proper authentication
3. Set up monitoring
4. Read full README.md

### 📚 Learn More

- **Full Documentation**: See `README.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Security**: See `production-rls.sql`

## Development Tips

### Hot Reload Not Working?
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Database Issues?
```bash
# View tables in Supabase
Go to Dashboard → Table Editor
```

### Real-time Not Working?
```bash
# Check browser console
F12 → Console → Look for WebSocket errors
```

## Support

**Common Questions:**
- Database schema: See `supabase-schema.sql`
- API functions: See `lib/supabase.ts`
- Components: Check files in `app/` directory

**Still stuck?**
1. Check all steps were completed
2. Verify Node.js version: `node --version` (should be 18+)
3. Check Supabase project status (green = healthy)

## Success Checklist

- [ ] Dependencies installed
- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Realtime enabled
- [ ] `.env.local` configured
- [ ] App running on localhost:3000
- [ ] Can create private room
- [ ] Can find matches
- [ ] Messages appear in real-time

## What You Built 🎉

You now have a fully functional romantic messenger with:

✅ Real-time messaging
✅ Interest-based matching
✅ Private room generation
✅ Beautiful UI with animations
✅ Typing indicators
✅ Heart reactions
✅ Mobile responsive design

**Congratulations!** 🎊 You're ready to connect hearts!

---

Need help? Check:
- README.md (comprehensive guide)
- ARCHITECTURE.md (how it works)
- Code comments (inline documentation)