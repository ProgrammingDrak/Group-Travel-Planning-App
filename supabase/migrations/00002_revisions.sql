-- ============================================================================
-- TripSync: Revisions Migration
-- Adds: expanded card types, commute segments, break time, itemized expenses,
--        date availability, card icons
-- ============================================================================

-- ==========================================================
-- 1. Expand card_type enum with more granular types (Rev 5)
-- ==========================================================
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'food';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'concert';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'outdoor';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'shopping';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'sightseeing';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'nightlife';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'spa';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'sports';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'museum';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'beach';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'flight';

-- ==========================================================
-- 2. Expand transport_mode enum (Rev 2)
-- ==========================================================
ALTER TYPE transport_mode ADD VALUE IF NOT EXISTS 'uber';
ALTER TYPE transport_mode ADD VALUE IF NOT EXISTS 'taxi';

-- ==========================================================
-- 3. Add icon column to cards (Rev 5)
-- ==========================================================
ALTER TABLE cards ADD COLUMN IF NOT EXISTS icon text DEFAULT NULL;

-- ==========================================================
-- 4. Card available dates (Rev 6)
-- ==========================================================
CREATE TABLE IF NOT EXISTS card_available_dates (
    id              uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id         uuid    NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    available_date  date    NOT NULL,
    UNIQUE (card_id, available_date)
);
CREATE INDEX IF NOT EXISTS idx_card_available_dates ON card_available_dates(card_id);

-- ==========================================================
-- 5. Commute segments (Rev 2, 3)
-- ==========================================================
CREATE TABLE IF NOT EXISTS commute_segments (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_card_id    uuid        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    to_card_id      uuid        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    break_minutes   integer     DEFAULT 0,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    UNIQUE (from_card_id, to_card_id)
);

CREATE TRIGGER trg_commute_segments_updated_at
    BEFORE UPDATE ON commute_segments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ==========================================================
-- 6. Commute options — multiple transport options per segment (Rev 2)
-- ==========================================================
CREATE TABLE IF NOT EXISTS commute_options (
    id                  uuid            PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id          uuid            NOT NULL REFERENCES commute_segments(id) ON DELETE CASCADE,
    mode                transport_mode  NOT NULL DEFAULT 'drive',
    label               text            DEFAULT '',
    duration_minutes    integer         DEFAULT 15,
    cost                numeric         DEFAULT 0,
    notes               text            DEFAULT '',
    confirmation_number text            DEFAULT '',
    attachment_urls     text[]          DEFAULT '{}',
    detail_fields       jsonb           DEFAULT '{}',
    sort_order          integer         DEFAULT 0
);

-- ==========================================================
-- 7. Commute option participants (Rev 2)
-- ==========================================================
CREATE TABLE IF NOT EXISTS commute_option_participants (
    id                  uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    commute_option_id   uuid    NOT NULL REFERENCES commute_options(id) ON DELETE CASCADE,
    participant_id      uuid    NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    UNIQUE (commute_option_id, participant_id)
);

-- ==========================================================
-- 8. Expense item type enum and line items table (Rev 4)
-- ==========================================================
DO $$ BEGIN
    CREATE TYPE expense_item_type AS ENUM ('per_person', 'communal');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS expense_line_items (
    id          uuid                PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id  uuid                NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    description text                NOT NULL DEFAULT '',
    amount      numeric             NOT NULL DEFAULT 0,
    item_type   expense_item_type   NOT NULL DEFAULT 'communal',
    sort_order  integer             DEFAULT 0
);

-- ==========================================================
-- 9. Expense participants — opt-in per expense (Rev 4)
-- ==========================================================
CREATE TABLE IF NOT EXISTS expense_participants (
    id              uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id      uuid    NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    participant_id  uuid    NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    is_opted_in     boolean DEFAULT true,
    UNIQUE (expense_id, participant_id)
);

-- ==========================================================
-- 10. Add payment tracking columns to expense_splits (Rev 4)
-- ==========================================================
ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS reimbursement_status text DEFAULT 'none';

-- ==========================================================
-- 11. RLS policies for new tables
-- ==========================================================
ALTER TABLE card_available_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE commute_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commute_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE commute_option_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON card_available_dates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON commute_segments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON commute_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON commute_option_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON expense_line_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON expense_participants FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- 12. Enable Realtime on new tables
-- ==========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE commute_segments;
ALTER PUBLICATION supabase_realtime ADD TABLE commute_options;
ALTER PUBLICATION supabase_realtime ADD TABLE commute_option_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_line_items;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_participants;

-- ==========================================================
-- 13. Expand vote score range from 1-3 to 1-5 (Rev 4: 5-tier voting)
-- ==========================================================
-- Drop the old CHECK constraint and add an updated one
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_score_check;
ALTER TABLE votes ADD CONSTRAINT votes_score_check CHECK (score >= 1 AND score <= 5);
