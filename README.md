# TripSync - Collaborative Group Travel Planning

A full-stack Next.js application where small groups (3-5 people) can democratically plan trips together. Vote on activities, manage budgets, coordinate schedules, and discuss plans in real-time.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Database & Auth:** Supabase (PostgreSQL + Realtime + Storage)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Forms:** React Hook Form + Zod validation
- **Drag & Drop:** @hello-pangea/dnd
- **Date Handling:** date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (free tier works)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Database Migrations

Apply the schema to your Supabase database:

1. Go to your Supabase Dashboard > SQL Editor
2. Open `supabase/migrations/00001_initial_schema.sql`
3. Run the entire SQL file

Or use the Supabase CLI:

```bash
npx supabase db push
```

### 4. Enable Realtime

In your Supabase Dashboard:

1. Go to Database > Replication
2. Enable realtime for tables: `cards`, `votes`, `comments`, `participants`

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (auth)/join/[invite_code]/     # Join trip page
    (main)/
      trip/[id]/                    # Main trip interface
      templates/                    # Browse templates
      create/                       # Create new trip
    api/
      trips/                        # Trip CRUD + date shifting
      cards/                        # Card CRUD + move/reorder
      votes/                        # Vote upsert + per-card listing
      comments/                     # Comments + reactions + pinning
      expenses/                     # Expense tracking + settlement
  components/
    card/                           # CardItem, CardModal, AddCardDialog
    trip/
      timeline/                     # Day-by-day accordion with DnD
      budget/                       # Budget overview + settlements
      route/                        # Route visualization
      list/                         # Searchable/filterable list
      accommodations/               # Multi-day cards (lodging, rentals)
    layout/                         # Header
    ui/                             # shadcn/ui components
  hooks/                            # useTrip, useCards, useRealtime, useParticipant
  lib/
    supabase/                       # Client + server Supabase clients
    validations/                    # Zod schemas
  types/                            # TypeScript type definitions
supabase/
  migrations/                       # SQL migration files
```

## Features

### Implemented (MVP)

- [x] **Trip Creation** - Name, destination, dates, budget, auto-generated invite code
- [x] **Invite System** - Share link `/join/[invite_code]`, join with name + email
- [x] **Timeline View** - Day-by-day accordion, drag-and-drop reordering, stage color coding
- [x] **Card System** - Activities, restaurants, events, lodging, rentals with full CRUD
- [x] **Card Modal** - 5-tab detail view (Details, Voting, Comments, Participants, Expenses)
- [x] **Voting** - 1-3 score voting with anonymous option, real-time vote counts
- [x] **Comments** - Threaded comments (1-level deep), emoji reactions, pinning
- [x] **Budget View** - Overview, category breakdown, settlement status, CSV export
- [x] **Route View** - Vertical timeline with transport modes, conflict detection
- [x] **List View** - Search, filter by stage/category, sort by date/budget/votes
- [x] **Accommodations View** - Multi-day card display with nightly rates
- [x] **Activity Library** - Unscheduled cards sidebar with search
- [x] **Date Management** - Bulk date shifting with locked-card protection
- [x] **Real-time Updates** - Supabase Realtime subscriptions for cards, votes, comments
- [x] **Participant Management** - localStorage session, participant avatars
- [x] **Stage Workflow** - Idea > Hot Contender > Chosen > Booked with color coding
- [x] **Expense Tracking** - Equal/custom splits, settlement status
- [x] **Templates** - Browse and duplicate public trip templates
- [x] **Responsive Design** - Mobile-first, works on all screen sizes
- [x] **Loading States** - Skeleton loaders and loading indicators
- [x] **Error Handling** - Error boundaries, form validation, API error responses

### Phase 2 (Planned)

- [ ] AI-powered activity suggestions (Claude API)
- [ ] Google Maps route optimization
- [ ] Conflict detection via AI
- [ ] Document parsing for booking confirmations
- [ ] Image upload to Supabase Storage
- [ ] @mention autocomplete in comments
- [ ] Expense auto-categorization

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `trips` | Trip details, invite codes, budget |
| `participants` | Trip members with organizer flag |
| `cards` | Activities/events with stage workflow |
| `card_participants` | Who's participating in each activity |
| `votes` | 1-3 score voting per card |
| `comments` | Threaded comments on cards |
| `comment_reactions` | Emoji reactions on comments |
| `expenses` | Expense records with split types |
| `expense_splits` | Per-person expense splits |
| `transportation_overrides` | Custom transport between cards |

### Views

- `cards_with_vote_stats` - Cards with average score and vote count
- `budget_summary_by_category` - Expenses grouped by category
- `participant_settlement_status` - Who owes whom

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/trips` | Create trip |
| GET | `/api/trips/[id]` | Get trip + participants |
| PATCH | `/api/trips/[id]` | Update trip |
| POST | `/api/trips/[id]/shift-dates` | Bulk date shifting |
| POST | `/api/cards` | Create card |
| GET/PATCH/DELETE | `/api/cards/[id]` | Card CRUD |
| POST | `/api/cards/[id]/move` | Move card date/order |
| POST | `/api/votes` | Cast/update vote |
| GET | `/api/votes/card/[card_id]` | Get votes for card |
| POST | `/api/comments` | Add comment |
| POST | `/api/comments/[id]/reaction` | Toggle reaction |
| PATCH | `/api/comments/[id]/pin` | Toggle pin |
| POST | `/api/expenses` | Record expense |
| PATCH | `/api/expenses/[id]/settle` | Mark split settled |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Known Limitations

- Authentication is session-based (localStorage) rather than full Supabase Auth with magic links
- Image upload UI is present but storage integration is Phase 2
- Route optimization requires Google Maps API (Phase 2)
- AI features (suggestions, conflict detection, auto-categorize) are Phase 2
- Realtime subscriptions work but presence ("X is viewing") is basic
