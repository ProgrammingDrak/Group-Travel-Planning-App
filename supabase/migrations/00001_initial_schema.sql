-- ============================================================================
-- TripSync: Group Travel Planning App - Initial Schema Migration
-- ============================================================================

-- ==========================================================
-- 1. Extensions
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 2. ENUM Types
-- ==========================================================
CREATE TYPE card_type AS ENUM (
    'activity',
    'restaurant',
    'event',
    'lodging',
    'rental'
);

CREATE TYPE card_stage AS ENUM (
    'idea',
    'hot_contender',
    'chosen',
    'booked'
);

CREATE TYPE transport_mode AS ENUM (
    'walk',
    'drive',
    'bike',
    'train',
    'bus',
    'boat',
    'plane',
    'other'
);

CREATE TYPE split_type AS ENUM (
    'equal',
    'custom_amount',
    'custom_percent'
);

-- ==========================================================
-- 3. Tables
-- ==========================================================

-- ----------------------------------------------------------
-- trips
-- ----------------------------------------------------------
CREATE TABLE trips (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            text        NOT NULL,
    destination     text        NOT NULL,
    start_date      date        NOT NULL,
    end_date        date        NOT NULL,
    creator_email   text        NOT NULL,
    invite_code     text        UNIQUE NOT NULL,
    is_template     boolean     DEFAULT false,
    total_budget    numeric     DEFAULT 0,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- ----------------------------------------------------------
-- participants
-- ----------------------------------------------------------
CREATE TABLE participants (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id         uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    first_name      text        NOT NULL,
    last_name       text        NOT NULL,
    email           text        NOT NULL,
    is_organizer    boolean     DEFAULT false,
    joined_at       timestamptz DEFAULT now(),

    UNIQUE (trip_id, email)
);

-- ----------------------------------------------------------
-- cards
-- ----------------------------------------------------------
CREATE TABLE cards (
    id                uuid            PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id           uuid            NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    type              card_type       NOT NULL DEFAULT 'activity',
    title             text            NOT NULL,
    description       text            DEFAULT '',
    date              date,
    start_time        time,
    duration_minutes  integer         DEFAULT 60,
    location          text            DEFAULT '',
    address           text            DEFAULT '',
    budget            numeric         DEFAULT 0,
    category          text            DEFAULT '',
    stage             card_stage      DEFAULT 'idea',
    is_date_locked    boolean         DEFAULT false,
    is_multi_day      boolean         DEFAULT false,
    end_date          date,
    images_urls       text[]          DEFAULT '{}',
    created_by        uuid            REFERENCES participants(id),
    sort_order        integer         DEFAULT 0,
    created_at        timestamptz     DEFAULT now(),
    updated_at        timestamptz     DEFAULT now()
);

-- ----------------------------------------------------------
-- card_participants
-- ----------------------------------------------------------
CREATE TABLE card_participants (
    id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id           uuid        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    participant_id    uuid        NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    is_participating  boolean     DEFAULT true,

    UNIQUE (card_id, participant_id)
);

-- ----------------------------------------------------------
-- votes
-- ----------------------------------------------------------
CREATE TABLE votes (
    id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id           uuid        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    participant_id    uuid        NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    score             integer     NOT NULL CHECK (score >= 1 AND score <= 3),
    is_anonymous      boolean     DEFAULT false,
    voted_at          timestamptz DEFAULT now(),

    UNIQUE (card_id, participant_id)
);

-- ----------------------------------------------------------
-- comments
-- ----------------------------------------------------------
CREATE TABLE comments (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id             uuid        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    participant_id      uuid        NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    content             text        NOT NULL,
    parent_comment_id   uuid        REFERENCES comments(id),
    is_pinned           boolean     DEFAULT false,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- ----------------------------------------------------------
-- comment_reactions
-- ----------------------------------------------------------
CREATE TABLE comment_reactions (
    id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id        uuid        NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    participant_id    uuid        NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    emoji             text        NOT NULL,
    created_at        timestamptz DEFAULT now(),

    UNIQUE (comment_id, participant_id, emoji)
);

-- ----------------------------------------------------------
-- expenses
-- ----------------------------------------------------------
CREATE TABLE expenses (
    id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id                 uuid        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    amount                  numeric     NOT NULL DEFAULT 0,
    paid_by_participant_id  uuid        NOT NULL REFERENCES participants(id),
    split_type              split_type  DEFAULT 'equal',
    category                text        DEFAULT '',
    created_at              timestamptz DEFAULT now()
);

-- ----------------------------------------------------------
-- expense_splits
-- ----------------------------------------------------------
CREATE TABLE expense_splits (
    id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id        uuid        NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    participant_id    uuid        NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    amount_owed       numeric     NOT NULL DEFAULT 0,
    is_settled        boolean     DEFAULT false,
    settled_at        timestamptz
);

-- ----------------------------------------------------------
-- transportation_overrides
-- ----------------------------------------------------------
CREATE TABLE transportation_overrides (
    id                uuid            PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id           uuid            NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    from_card_id      uuid            NOT NULL REFERENCES cards(id),
    mode              transport_mode  DEFAULT 'drive',
    duration_minutes  integer         DEFAULT 15,
    notes             text            DEFAULT ''
);

-- ==========================================================
-- 4. Indexes
-- ==========================================================
CREATE INDEX idx_trips_invite_code         ON trips (invite_code);
CREATE INDEX idx_cards_trip_date_sort      ON cards (trip_id, date, sort_order);
CREATE INDEX idx_votes_card_id             ON votes (card_id);
CREATE INDEX idx_comments_card_id          ON comments (card_id);
CREATE INDEX idx_participants_trip_email   ON participants (trip_id, email);

-- ==========================================================
-- 5. Views
-- ==========================================================

-- ----------------------------------------------------------
-- cards_with_vote_stats
-- Joins cards with votes to show average score and vote count
-- per card.
-- ----------------------------------------------------------
CREATE VIEW cards_with_vote_stats AS
SELECT
    c.id,
    c.trip_id,
    c.type,
    c.title,
    c.description,
    c.date,
    c.start_time,
    c.duration_minutes,
    c.location,
    c.address,
    c.budget,
    c.category,
    c.stage,
    c.is_date_locked,
    c.is_multi_day,
    c.end_date,
    c.images_urls,
    c.created_by,
    c.sort_order,
    c.created_at,
    c.updated_at,
    COALESCE(ROUND(AVG(v.score)::numeric, 2), 0) AS avg_score,
    COUNT(v.id)::integer                          AS vote_count
FROM cards c
LEFT JOIN votes v ON v.card_id = c.id
GROUP BY
    c.id,
    c.trip_id,
    c.type,
    c.title,
    c.description,
    c.date,
    c.start_time,
    c.duration_minutes,
    c.location,
    c.address,
    c.budget,
    c.category,
    c.stage,
    c.is_date_locked,
    c.is_multi_day,
    c.end_date,
    c.images_urls,
    c.created_by,
    c.sort_order,
    c.created_at,
    c.updated_at;

-- ----------------------------------------------------------
-- budget_summary_by_category
-- Groups expenses by trip and category, showing the total
-- spent in each.
-- ----------------------------------------------------------
CREATE VIEW budget_summary_by_category AS
SELECT
    c.trip_id,
    e.category,
    SUM(e.amount)   AS total
FROM expenses e
JOIN cards c ON c.id = e.card_id
GROUP BY c.trip_id, e.category;

-- ----------------------------------------------------------
-- participant_settlement_status
-- Calculates how much each participant owes or is owed per
-- trip, based on expense_splits and expenses.
-- ----------------------------------------------------------
CREATE VIEW participant_settlement_status AS
SELECT
    p.id            AS participant_id,
    p.trip_id,
    p.first_name,
    p.last_name,
    p.email,
    COALESCE(paid.total_paid, 0)    AS total_paid,
    COALESCE(owed.total_owed, 0)    AS total_owed,
    COALESCE(paid.total_paid, 0)
        - COALESCE(owed.total_owed, 0) AS net_balance
FROM participants p
LEFT JOIN (
    -- Total amount each participant has paid across all expenses
    SELECT
        e.paid_by_participant_id AS participant_id,
        SUM(e.amount)            AS total_paid
    FROM expenses e
    GROUP BY e.paid_by_participant_id
) paid ON paid.participant_id = p.id
LEFT JOIN (
    -- Total amount each participant owes across all splits
    SELECT
        es.participant_id,
        SUM(es.amount_owed) AS total_owed
    FROM expense_splits es
    WHERE es.is_settled = false
    GROUP BY es.participant_id
) owed ON owed.participant_id = p.id;

-- ==========================================================
-- 6. Trigger: auto-update updated_at columns
-- ==========================================================

-- Function to set updated_at to now() on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to trips
CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Apply the trigger to cards
CREATE TRIGGER trg_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Apply the trigger to comments
CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ==========================================================
-- 7. Function: generate_invite_code()
-- ==========================================================

-- Generates a random 8-character alphanumeric code.
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
DECLARE
    chars  text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result text := '';
    i      integer;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- 8. Trigger: auto-generate invite_code on trips INSERT
-- ==========================================================

-- Before inserting a trip, if invite_code is NULL or empty,
-- generate a unique one automatically.
CREATE OR REPLACE FUNCTION trg_set_invite_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code text;
    code_exists boolean;
BEGIN
    IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
        LOOP
            new_code := generate_invite_code();
            SELECT EXISTS(SELECT 1 FROM trips WHERE invite_code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        NEW.invite_code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trips_invite_code
    BEFORE INSERT ON trips
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_invite_code();
