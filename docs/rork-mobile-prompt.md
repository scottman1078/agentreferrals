# AgentReferrals Mobile App — Rork Prompt

Build a React Native / Expo mobile app called **AgentReferrals** — a real estate agent referral marketplace. The app connects agents across the country so they can send referrals, bid on opportunities, and track their referral pipeline.

## Design System
- Clean, modern UI with a warm professional feel
- Primary color: `#f0a500` (gold/amber)
- Dark mode support
- Use SF Pro / system fonts
- Rounded cards with subtle shadows
- Bottom tab navigation

## Authentication
- Email magic link login (Supabase Auth)
- Phone number verification (optional, for enhanced trust)
- Persist session with SecureStore

## Bottom Tab Navigation (5 tabs)

### 1. Marketplace (Home tab — default)
This is the main feed. Show a scrollable list of open referral opportunities posted by other agents.

Each card shows:
- Posting agent name, brokerage, avatar (colored circle with initials)
- Target market + neighborhood (e.g. "Charlotte, NC — SouthPark")
- **Budget range in large bold green text** (e.g. "$500k - $700k") — this is the hero element
- Decision deadline with countdown badge (red if < 24h, amber if < 3 days)
- Early access badge (purple, with countdown) if within 2hr window for paid members
- Buyer/Seller badge
- Bid count, view count, time posted
- Client need tags (e.g. "Pre-approved", "Family of 4", "Good schools")

Tapping a card expands to show:
- Full description from posting agent
- "Pitch for This Referral" button that opens a form:
  - Text pitch (multiline)
  - Key qualifications (comma separated, turned into chips)
  - Toggle to record/upload a video pitch (60 sec max)
  - Submit button

Top of marketplace has:
- Search bar (filter by market, neighborhood, keywords)
- "Post Referral" FAB button (always visible)
- Filter pills: All, Buyer, Seller, My Area

**Post Referral form** (modal):
- Market (required)
- Neighborhood
- Buyer / Seller / Both toggle
- Budget range
- Timeline
- Decision deadline (date picker) — with helper text "When you'll choose an agent"
- Referral fee %
- Description (required)
- Client needs (comma separated tags)

### 2. Pipeline
Show the user's active referrals in a vertical pipeline view.

Each referral card shows:
- Client name
- Market
- Receiving/sending agent name + avatar
- Current stage badge (color-coded):
  - Agreement Sent (indigo)
  - Agreement Executed (purple)
  - Client Introduced (amber)
  - Under Contract (orange)
  - Closed - Fee Pending (green)
  - Fee Received (emerald)
- Estimated price
- Referral fee %
- Estimated close date

Tapping a referral shows detail view with timeline of stage changes.

### 3. Partners
Show the user's referral network as a list grouped by:
- **My Partners** (direct connections)
- **1-Degree** (partners of partners)

Each partner card shows:
- Name, brokerage, market area
- ReferNet Score (0-100) with color badge
- Response time
- Closed referral count
- Endorsement emoji chips (top 3 skills)
- "Message" and "Send Referral" quick action buttons

Tapping a partner opens their profile:
- Avatar, name, brokerage, area
- Stats row: deals/yr, years licensed, avg sale price, closed referrals, network size
- ReferNet Score + Comm Score
- Endorsements section (skill pills with counts)
- Video intro player (if they have one)
- Zoom interview recordings (if public)
- Reviews with star ratings
- Specialization tags
- "Request Partnership" / "Send Referral" / "Message" buttons

### 4. Messages
Simple chat interface between agents.
- List of conversations sorted by most recent
- Each row: partner avatar, name, last message preview, timestamp, unread badge
- Tapping opens chat thread
- Text input with send button
- Show typing indicator
- Messages should support links (to referrals, profiles)

### 5. NORA (AI Assistant)
Chat interface with NORA, the AI referral assistant.
- Opens with a daily briefing message that includes:
  - Urgent actions (overdue partner updates, stale referrals)
  - Pipeline snapshot (active count, closed count, milestones)
  - Marketplace opportunities (new posts in your area, pending bids)
  - Comm Score trend
- Quick action buttons below briefing:
  - "Draft Messages" — generates check-in messages for overdue partners
  - "Show Marketplace" — switches to marketplace tab
  - "My Pipeline" — switches to pipeline tab
  - "Find Agent in..." — starts a search
- Free-form text input for questions
- Agent card results inline (name, score, brokerage, specialties)
- "Start Referral with Top Match" button on search results

## Push Notifications (Expo Notifications)
Register for push on login. Send notifications for:
- **New marketplace post in your market** — "🔥 New $500k-$700k buyer referral in Charlotte, NC — 3 days to decide"
- **Someone bid on your post** — "Michelle Foster pitched for your Charlotte referral (with video)"
- **Your bid was awarded** — "🎉 You won the Nashville referral from Jason O'Brien!"
- **New partnership request** — "Carlos Vega wants to partner with you"
- **New message from partner** — "Ashley Monroe: Hey, checking in on the Martinez referral..."
- **Decision deadline approaching** — "⏰ 6 hours left to choose an agent for your Charlotte referral"
- **Comm Score dropping** — "📉 Your Comm Score dropped 4 points — send updates to recover"
- **Daily briefing** — "Good morning! You have 2 new opportunities and 1 partner waiting on an update"

Tapping a notification deep-links to the relevant screen.

## Profile / Settings (accessible from top-right avatar)
- Name, email, phone, brokerage
- Market area / zip codes
- Specialization tags (multi-select)
- Video intro upload
- Notification preferences (toggle each notification type)
- Subscription tier display
- Sign out

## Data / Backend
- **Supabase** for auth, database, and realtime
- API base URL: `https://agentreferrals.ai/api` (or Supabase direct)
- Key tables: `ar_profiles`, `ar_referrals`, `ar_partnerships`, `ar_messages`, `ar_marketplace_posts`, `ar_marketplace_bids`, `ar_endorsements`, `ar_reviews`
- Use Supabase Realtime for live message updates and new marketplace posts

## Key UX Principles
- Marketplace is the HOME screen — this is what brings users back daily
- Budget/price should be the loudest element on every card (large, bold, green)
- Decision deadlines create urgency — always show the countdown
- Keep it fast — no loading spinners longer than 1 second
- Pull-to-refresh on all list views
- Haptic feedback on bid submit, partnership request, referral send
- Skeleton loading states for all cards
