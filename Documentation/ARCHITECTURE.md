# AuraChat Architecture Documentation

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │  Landing   │  │  Chat       │  │  Waiting Room    │    │
│  │  Page      │  │  Interface  │  │  (Matching)      │    │
│  └────────────┘  └─────────────┘  └──────────────────┘    │
│         │                │                   │              │
│         └────────────────┴───────────────────┘              │
│                          │                                  │
│              ┌───────────▼───────────┐                      │
│              │   Next.js 14 App      │                      │
│              │   (App Router)        │                      │
│              └───────────┬───────────┘                      │
└──────────────────────────┼──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │  Supabase Client    │
                │  - Auth             │
                │  - Realtime         │
                │  - Database         │
                └──────────┬──────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Supabase Backend                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                    │   │
│  │  ┌──────┐  ┌──────┐  ┌────────────┐  ┌──────────┐ │   │
│  │  │Users │  │Rooms │  │Participants│  │Messages  │ │   │
│  │  └──────┘  └──────┘  └────────────┘  └──────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Realtime Server                        │   │
│  │  - WebSocket Connections                            │   │
│  │  - Change Data Capture (CDC)                        │   │
│  │  - Broadcast Channels                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Private Room Creation Flow

```
User
  │
  │ 1. Enter name
  ▼
Landing Page
  │
  │ 2. Click "Create Private Room"
  ▼
createAnonymousUser()
  │
  │ 3. INSERT INTO users
  ▼
Database (users table)
  │
  ▼
createPrivateRoom()
  │
  │ 4. INSERT INTO rooms (with invite_code)
  ▼
Database (rooms table)
  │
  │ 5. INSERT INTO room_participants
  ▼
Database (room_participants table)
  │
  │ 6. Return room ID
  ▼
Redirect to /chat/[room-id]
  │
  ▼
Chat Interface
```

### 2. Soulmate Matching Flow

```
User A                          System                          User B
  │                               │                               │
  │ 1. Select interests           │                               │
  ├──────────────────────────────►│                               │
  │                               │                               │
  │                               │ 2. Mark as searching          │
  │                               │    UPDATE users               │
  │                               │    SET is_searching=true      │
  │                               │                               │
  │                               │ 3. Find best match            │
  │                               │    (interest overlap)         │
  │                               │◄──────────────────────────────┤
  │                               │                               │
  │                               │ 4. CREATE matched room        │
  │                               │    INSERT INTO rooms          │
  │                               │                               │
  │                               │ 5. Add both users             │
  │                               │    INSERT INTO                │
  │                               │    room_participants          │
  │                               │                               │
  │ 6. Realtime notification      │    6. Realtime notification   │
  │◄──────────────────────────────┤───────────────────────────────►
  │                               │                               │
  ▼                               ▼                               ▼
Chat Interface              Room Created                  Chat Interface
```

### 3. Real-time Messaging Flow

```
Sender                    Supabase                      Receiver
  │                          │                             │
  │ 1. Type message          │                             │
  │    setTypingStatus()     │                             │
  ├─────────────────────────►│                             │
  │                          │                             │
  │                          │ 2. UPDATE room_participants │
  │                          │    is_typing=true           │
  │                          │                             │
  │                          │ 3. Broadcast via Realtime   │
  │                          ├────────────────────────────►│
  │                          │                             │
  │                          │                             │ 4. Show "typing..."
  │                          │                             │
  │ 5. Send message          │                             │
  │    sendMessage()         │                             │
  ├─────────────────────────►│                             │
  │                          │                             │
  │                          │ 6. INSERT INTO messages     │
  │                          │                             │
  │                          │ 7. Realtime subscription    │
  │                          │    triggers (CDC)           │
  │                          ├────────────────────────────►│
  │                          │                             │
  │ 8. Message appears       │                             │ 8. Message appears
  │                          │                             │
```

## Component Architecture

### Frontend Components

```
app/
├── page.tsx (Landing Page)
│   ├── <InterestSelector />
│   ├── <ModeSelection />
│   └── <UsernameInput />
│
├── chat/[id]/page.tsx (Chat Interface)
│   ├── <ChatHeader />
│   ├── <MessageList />
│   │   ├── <MessageBubble />
│   │   └── <TypingIndicator />
│   └── <MessageInput />
│
├── join/[code]/page.tsx (Join Private Room)
│   └── <InviteForm />
│
└── waiting/page.tsx (Matching Queue)
    └── <LoadingAnimation />
```

### State Management

```
User State (localStorage)
├── userId: string
└── username: string

Room State (React State)
├── room: Room
├── participants: RoomParticipant[]
├── messages: Message[]
├── otherUserTyping: boolean
└── newMessage: string

Realtime Subscriptions
├── message-channel (INSERT on messages)
└── typing-channel (UPDATE on room_participants)
```

## Database Schema Details

### Entity-Relationship Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ username        │
│ avatar_url      │
│ interests[]     │
│ is_searching    │
│ created_at      │
│ last_active     │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│ room_participants│
├─────────────────┤
│ id (PK)         │
│ room_id (FK)    │
│ user_id (FK)    │
│ joined_at       │
│ is_typing       │
└────────┬────────┘
         │
         │ N:1
         │
┌────────▼────────┐       ┌─────────────────┐
│     rooms       │       │    messages     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │1:N    │ id (PK)         │
│ type            │───────│ room_id (FK)    │
│ created_by (FK) │       │ sender_id (FK)  │
│ invite_code     │       │ content         │
│ matched_interests│      │ reaction        │
│ is_active       │       │ created_at      │
│ created_at      │       │ read_at         │
│ expires_at      │       └─────────────────┘
└─────────────────┘
```

### Table Relationships

1. **users → rooms** (1:N via created_by)
   - A user can create multiple rooms
   
2. **users → room_participants** (1:N)
   - A user can be in multiple rooms
   
3. **rooms → room_participants** (1:N)
   - A room has multiple participants
   
4. **rooms → messages** (1:N)
   - A room contains multiple messages
   
5. **users → messages** (1:N via sender_id)
   - A user can send multiple messages

## Real-time Architecture

### Supabase Realtime Channels

```
┌────────────────────────────────────────────────────────┐
│              Supabase Realtime Server                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Channel: room-messages-{roomId}                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Event: INSERT on messages                     │    │
│  │ Filter: room_id = eq.{roomId}                 │    │
│  │ Action: Broadcast new message to subscribers  │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  Channel: room-typing-{roomId}                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ Event: UPDATE on room_participants            │    │
│  │ Filter: room_id = eq.{roomId}                 │    │
│  │ Action: Broadcast typing status               │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  Channel: user-rooms                                  │
│  ┌──────────────────────────────────────────────┐    │
│  │ Event: INSERT on room_participants            │    │
│  │ Filter: user_id = eq.{userId}                 │    │
│  │ Action: Notify user of new room               │    │
│  └──────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

### WebSocket Connection Flow

```
1. Client connects to Supabase
   ws://your-project.supabase.co/realtime/v1/websocket

2. Client subscribes to channel
   {
     "topic": "room-messages-123",
     "event": "phx_join",
     "payload": {}
   }

3. Server acknowledges subscription
   {
     "topic": "room-messages-123",
     "event": "phx_reply",
     "payload": { "status": "ok" }
   }

4. Database change triggers event
   INSERT INTO messages (room_id, sender_id, content)

5. Server broadcasts to subscribers
   {
     "topic": "room-messages-123",
     "event": "postgres_changes",
     "payload": {
       "data": { "new": { /* message data */ } }
     }
   }

6. Client updates UI
   setMessages(prev => [...prev, newMessage])
```

## Security Architecture

### Row Level Security (RLS) Policies

```
┌─────────────────────────────────────────────────┐
│              Database Layer                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Request → RLS Policy Check → Query Execution  │
│                                                 │
│  Example: SELECT * FROM messages               │
│           WHERE room_id = '123'                 │
│              ↓                                  │
│  Policy: User must be participant in room      │
│              ↓                                  │
│  Check: EXISTS (SELECT 1                        │
│          FROM room_participants                 │
│          WHERE room_id = '123'                  │
│          AND user_id = current_user)            │
│              ↓                                  │
│  Result: ✓ Allowed or ✗ Denied                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Security Layers

1. **Network Layer**
   - HTTPS/WSS encryption
   - CORS policies
   - Rate limiting

2. **Application Layer**
   - Input validation
   - Content moderation
   - Session management

3. **Database Layer**
   - RLS policies
   - Foreign key constraints
   - Triggers for validation

4. **Realtime Layer**
   - Channel access control
   - Message filtering
   - Subscription authorization

## Performance Optimizations

### Database Indexes

```sql
-- Message retrieval optimization
CREATE INDEX idx_messages_room 
ON messages(room_id, created_at DESC);

-- User matching optimization
CREATE INDEX idx_users_searching 
ON users(is_searching) 
WHERE is_searching = true;

-- Invite code lookup optimization
CREATE INDEX idx_rooms_invite_code 
ON rooms(invite_code) 
WHERE invite_code IS NOT NULL;
```

### Caching Strategy

```
┌──────────────────┐
│   Client Side    │
├──────────────────┤
│ • localStorage   │ ← User session
│ • React State    │ ← Current room data
│ • Query Cache    │ ← Recent messages
└──────────────────┘

┌──────────────────┐
│   Server Side    │
├──────────────────┤
│ • Supabase Edge  │ ← API responses
│ • PostgreSQL     │ ← Query results
└──────────────────┘
```

## Deployment Architecture

```
┌────────────────────────────────────────────┐
│           Vercel (Frontend)                │
├────────────────────────────────────────────┤
│ • Next.js SSR/SSG                          │
│ • Edge Functions                           │
│ • CDN Distribution                         │
└──────────────┬─────────────────────────────┘
               │
               │ API Calls
               │
┌──────────────▼─────────────────────────────┐
│         Supabase (Backend)                 │
├────────────────────────────────────────────┤
│ • PostgreSQL Database                      │
│ • Realtime Server                          │
│ • Authentication                           │
│ • Storage (Future)                         │
└────────────────────────────────────────────┘

Global CDN
├── Static Assets
├── Images
└── Fonts
```

## Scalability Considerations

### Horizontal Scaling

```
Load Balancer
    │
    ├── Next.js Instance 1
    ├── Next.js Instance 2
    └── Next.js Instance N
         │
         └── Supabase (Auto-scaling)
              ├── Read Replicas
              └── Connection Pooling
```

### Future Enhancements

1. **Message Pagination**
   - Load messages in chunks
   - Implement virtual scrolling

2. **Connection Pooling**
   - Optimize database connections
   - Implement connection limits

3. **Caching Layer**
   - Redis for session data
   - CDN for static assets

4. **Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring
   - Real-time analytics

## Monitoring & Logging

```
Application Logs
├── Error Events
├── User Actions
└── Performance Metrics

Database Logs
├── Slow Queries
├── Connection Stats
└── Table Statistics

Realtime Logs
├── Connection Count
├── Message Throughput
└── Channel Activity
```

---

This architecture is designed to be:
- **Scalable**: Can handle growth in users and messages
- **Secure**: Multiple layers of security protection
- **Performant**: Optimized for real-time interactions
- **Maintainable**: Clean separation of concerns
- **Extensible**: Easy to add new features